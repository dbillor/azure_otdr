import numpy as np
from scipy.ndimage import gaussian_filter1d
from otdr_parser import parse_file, SORFile

MIN_SPACING = 10


def parse_sor_file(file_path: str):
    with open(file_path, 'rb') as file:
        sor_file = parse_file(file.read())
    return sor_file


def coallesce_results(detected_fiber_issues):

    if len(detected_fiber_issues) == 0:
        return []
    intervaled_results = []
    curr_interval = [detected_fiber_issues[0], detected_fiber_issues[0]]
    for i in range(1, len(detected_fiber_issues)):
        if detected_fiber_issues[i] - curr_interval[0] > 75:
            intervaled_results.append(curr_interval.copy())
            curr_interval = [detected_fiber_issues[i], detected_fiber_issues[i]]
        else:
            curr_interval[1] = detected_fiber_issues[i]

    intervaled_results.append(curr_interval)
    return intervaled_results


def plot_and_detect(sor_file: SORFile,
                    plot_name: str,
                    start_panel: str,
                    fiber_distance: str,
                    scan_type: str):
    try:
        # Speed of light and refractive index
        speed_of_light = 299792458.0  # m/s
        refractive_index = sor_file.fixed_parameters.group_index / 100000.0  # otdrs_out['fixed_parameters']['group_index'] / 100000.0
        speed_of_light_in_fibre = speed_of_light / refractive_index

        # Distance calculations
        seconds_per_10k_points = sor_file.fixed_parameters.data_spacing[0] / 1e10  # otdrs_out['fixed_parameters']['data_spacing'][0] / 1e10
        metres_per_data_spacing = ((seconds_per_10k_points / 10000.0) * speed_of_light_in_fibre)

        # Scale data points
        sf = sor_file.data_points.scale_factors[0].scale_factor  # otdrs_out['data_points']['scale_factors'][0]['scale_factor']
        scaled_data = -(65535 - np.array(sor_file.data_points.scale_factors[0].data)) / float(sf)

        # X-axis: distances in meters
        spacing = np.arange(0, metres_per_data_spacing * len(scaled_data), metres_per_data_spacing)[:len(scaled_data)]
        valid_indices = spacing <= 8500 if scan_type == "short" and fiber_distance > 8000 else spacing <= fiber_distance

        spacing_filtered = spacing[valid_indices]
        scaled_data_filtered = scaled_data[valid_indices]

        seconds_to_front_panel = sor_file.fixed_parameters.front_panel_offset / 1e10  # otdrs_out['fixed_parameters']['front_panel_offset']/1e10
        seconds_to_launch_connector = sor_file.general_parameters.user_offset / 1e10  # otdrs_out['general_parameters']['user_offset']/1e10
        # And in metres, that's distance = time * speed
        metres_to_front_panel = seconds_to_front_panel * speed_of_light_in_fibre
        # Same again for launch - but we do need to offset from the front panel...
        metres_to_launch_connector = (seconds_to_launch_connector * speed_of_light_in_fibre) + metres_to_front_panel
        # Find index range for valid data
        start_idx = np.searchsorted(spacing_filtered, start_panel)

        # Trim data
        spacing_trimmed = spacing_filtered[start_idx:]
        scaled_data_trimmed = scaled_data_filtered[start_idx:]

        # Gaussian smoothing for less noisy data analysis
        sigma_value = 50  # Adjust for stronger/weaker smoothing
        smoothed_data = gaussian_filter1d(scaled_data_trimmed, sigma=sigma_value)

        # First derivative for high gradient detection and second derivative for potential inflections
        slope = np.gradient(smoothed_data, spacing_trimmed)
        curve = np.gradient(slope, spacing_trimmed)

        last_detected_point = -MIN_SPACING
        back_reflections = []
        fiber_issues = []

        for i in range(1, len(slope)):
            drop_amount = slope[i]

            # Fiber Issue Detection
            if drop_amount >= 0.005 and (spacing_trimmed[i] - last_detected_point) >= MIN_SPACING:
                fiber_issues.append(spacing_trimmed[i])
                last_detected_point = spacing_trimmed[i]

            # Back reflection detection
            elif drop_amount < -.005 and curve[i] < 0:
                back_reflections.append(spacing_trimmed[i])

        # Just collect the analyzed data for the frontend
        # No need to generate plots as the frontend will do visualization

        merged_back_reflections = coallesce_results(back_reflections)
        merged_fiber_issues = coallesce_results(fiber_issues)

        return True, {"logs": f"Successfully analzyed sor file with back reflection at {merged_back_reflections} \
                      and fiber issues at {merged_fiber_issues}"}
    except Exception as e:
        err = f"Failed to analyze sor file with error {e}"
        return False, {"error": err}


def process_traces(otdr_files, fiber_distance, dir="/tmp"):
    otdr_file_list = otdr_files.split(',')
    fiber_distance = fiber_distance * 1000
    images = []
    results = {}
    for otdr_file in otdr_file_list:
        otdrs_out = parse_sor_file(f"{dir}/{otdr_file}")
        components = otdr_file.split("_")
        if len(components) < 4:
            continue  # invalid sor file name
        device = components[0]
        port = components[1].lower()
        scan_type = components[2].lower()
        plot_name = f"{device}_{port}_{scan_type}"
        status, info = plot_and_detect(otdrs_out, plot_name, 50, fiber_distance, scan_type)
        images.append(plot_name)
        results[plot_name] = info
    return True, results


# --------------------- Additional Utilities -----------------------------


# Note: Azure blob storage functions are commented out since they're not fully implemented
# and are not needed for local development

"""
def download_sor_file(keyvault_uri: str = 'https://optical.vault.azure.net/',
                      blob_account_name: str = 'mobystorage',
                      blob_access_key_name: str = 'moby-blob-access-key',
                      local_path: str = "/tmp",
                      sor_blob_name: str = None):
    try:
        if sor_blob_name is None:
            raise ("Failed to provide any SOR file name.")
        # Requires azblob_client to be implemented
        blob_service = azblob_client.get_azblob_client(keyvault_uri, blob_account_name, blob_access_key_name)
        azblob_client.download_object("otdr", sor_blob_name, local_path, blob_service)
        local_full_path = local_path + "/" + sor_blob_name
        return local_full_path
    except Exception as e:
        err = f'Failed to download {sor_blob_name} from Azure blob storage {blob_account_name}/otdr ' \
              f'due to exception {e}.'
        return False, {"error": err}


def upload_otdr_chart(keyvault_uri: str = 'https://optical.vault.azure.net/',
                      blob_account_name: str = 'mobystorage',
                      blob_access_key_name: str = 'moby-blob-access-key',
                      blob_file_name: str = None,
                      local_path: str = None):
    try:
        if local_path is None or blob_file_name is None:
            return False, {"error": "failed to provide file or blob name"}
        # Requires azblob_client to be implemented
        blob_service = azblob_client.get_azblob_client(keyvault_uri, blob_account_name, blob_access_key_name)
        blob_client = blob_service.get_blob_client(container="otdr", blob=blob_file_name)
        with open(local_path, 'rb') as data:
            blob_client.upload_blob(data)
        log = f'Successfully uploaded {blob_file_name} to Azure blob storage {blob_account_name}/otdr.'
        return True, {"log": log}
    except Exception as e:
        err = f'Failed to upload {local_path} to Azure blob storage {blob_account_name}/otdr ' \
              f'due to exception {e}.'
        return False, {"error": err}
"""

