import struct
from dataclasses import dataclass
from typing import List, Optional
# --------------------------
# Types (from src/types.rs)
# --------------------------


@dataclass
class BlockInfo:
    identifier: str
    revision_number: int  # u16 in Rust
    size: int            # i32


@dataclass
class MapBlock:
    revision_number: int
    block_size: int
    block_count: int
    block_info: List[BlockInfo]


@dataclass
class GeneralParametersBlock:
    language_code: str
    cable_id: str
    fiber_id: str
    fiber_type: int
    nominal_wavelength: int
    originating_location: str
    terminating_location: str
    cable_code: str
    current_data_flag: str
    user_offset: int
    user_offset_distance: int
    operator: str
    comment: str


@dataclass
class SupplierParametersBlock:
    supplier_name: str
    otdr_mainframe_id: str
    otdr_mainframe_sn: str
    optical_module_id: str
    optical_module_sn: str
    software_revision: str
    other: str


@dataclass
class FixedParametersBlock:
    date_time_stamp: int
    units_of_distance: str
    actual_wavelength: int
    acquisition_offset: int
    acquisition_offset_distance: int
    total_n_pulse_widths_used: int
    pulse_widths_used: List[int]
    data_spacing: List[int]
    n_data_points_for_pulse_widths_used: List[int]
    group_index: int
    backscatter_coefficient: int
    number_of_averages: int
    averaging_time: int
    acquisition_range: int
    acquisition_range_distance: int
    front_panel_offset: int
    noise_floor_level: int
    noise_floor_scale_factor: int
    power_offset_first_point: int
    loss_threshold: int
    reflectance_threshold: int
    end_of_fibre_threshold: int
    trace_type: str
    window_coordinate_1: int
    window_coordinate_2: int
    window_coordinate_3: int
    window_coordinate_4: int


@dataclass
class KeyEvent:
    event_number: int
    event_propogation_time: int
    attenuation_coefficient_lead_in_fiber: int
    event_loss: int
    event_reflectance: int
    event_code: str
    loss_measurement_technique: str
    marker_location_1: int
    marker_location_2: int
    marker_location_3: int
    marker_location_4: int
    marker_location_5: int
    comment: str


@dataclass
class LastKeyEvent:
    event_number: int
    event_propogation_time: int
    attenuation_coefficient_lead_in_fiber: int
    event_loss: int
    event_reflectance: int
    event_code: str
    loss_measurement_technique: str
    marker_location_1: int
    marker_location_2: int
    marker_location_3: int
    marker_location_4: int
    marker_location_5: int
    comment: str
    end_to_end_loss: int
    end_to_end_marker_position_1: int
    end_to_end_marker_position_2: int
    optical_return_loss: int
    optical_return_loss_marker_position_1: int
    optical_return_loss_marker_position_2: int


@dataclass
class KeyEvents:
    number_of_key_events: int
    key_events: List[KeyEvent]
    last_key_event: LastKeyEvent


@dataclass
class Landmark:
    landmark_number: int
    landmark_code: str
    landmark_location: int
    related_event_number: int
    gps_longitude: int
    gps_latitude: int
    fiber_correction_factor_lead_in_fiber: int
    sheath_marker_entering_landmark: int
    sheath_marker_leaving_landmark: int
    units_of_sheath_marks_leaving_landmark: str
    mode_field_diameter_leaving_landmark: int
    comment: str


@dataclass
class DataPointsAtScaleFactor:
    n_points: int
    scale_factor: int
    data: List[int]


@dataclass
class DataPoints:
    number_of_data_points: int
    total_number_scale_factors_used: int
    scale_factors: List[DataPointsAtScaleFactor]


@dataclass
class LinkParameters:
    number_of_landmarks: int
    landmarks: List[Landmark]


@dataclass
class ProprietaryBlock:
    header: str
    data: bytes


@dataclass
class SORFile:
    map: MapBlock
    general_parameters: Optional[GeneralParametersBlock]
    supplier_parameters: Optional[SupplierParametersBlock]
    fixed_parameters: Optional[FixedParametersBlock]
    key_events: Optional[KeyEvents]
    link_parameters: Optional[LinkParameters]
    data_points: Optional[DataPoints]
    proprietary_blocks: List[ProprietaryBlock]


class ParseError(Exception):
    pass
# --------------------------
# Parser Helpers (like nom)
# --------------------------


BLOCK_ID_MAP = "Map"
# Block header string for the general parameters block
BLOCK_ID_GENPARAMS = "GenParams"
# Block header string for the supplier parameters block
BLOCK_ID_SUPPARAMS = "SupParams"
# Block header string for the fixed parameters block
BLOCK_ID_FXDPARAMS = "FxdParams"
# Block header string for the key events block
BLOCK_ID_KEYEVENTS = "KeyEvents"
# Block header string for the link parameters block
BLOCK_ID_LNKPARAMS = "LnkParams"
# Block header string for the data points block
BLOCK_ID_DATAPTS = "DataPts"
# Block header string for the checksum block
BLOCK_ID_CHECKSUM = "Cksum"


def parse_le_i16(data: bytes, offset: int):
    if offset + 2 > len(data):
        raise ParseError("Unexpected end of data in i16")
    value = struct.unpack_from('<h', data, offset)[0]
    return value, offset + 2


def parse_le_i32(data: bytes, offset: int):
    if offset + 4 > len(data):
        raise ParseError("Unexpected end of data in i32")
    value = struct.unpack_from('<i', data, offset)[0]
    return value, offset + 4


def parse_le_u16(data: bytes, offset: int):
    if offset + 2 > len(data):
        raise ParseError("Unexpected end of data in u16")
    value = struct.unpack_from('<H', data, offset)[0]
    return value, offset + 2


def parse_le_u32(data: bytes, offset: int):
    if offset + 4 > len(data):
        raise ParseError("Unexpected end of data in u32")
    value = struct.unpack_from('<I', data, offset)[0]
    return value, offset + 4


def fixed_length_str(data: bytes, offset: int, n_bytes: int):
    if offset + n_bytes > len(data):
        raise ParseError("Unexpected end of data in fixed_length_str")
    s = data[offset: offset + n_bytes]
    try:
        decoded = s.decode("utf-8")
    except UnicodeDecodeError as e:
        raise ParseError("Failed to decode fixed_length_str") from e
    return decoded, offset + n_bytes


def null_terminated_chunk(data: bytes, offset: int):
    end = data.find(b'\0', offset)
    if end == -1:
        raise ParseError("Null terminator not found")
    chunk = data[offset:end]
    return chunk, end + 1


def null_terminated_str(data: bytes, offset: int):
    chunk, new_offset = null_terminated_chunk(data, offset)
    try:
        decoded = chunk.decode("utf-8")
    except UnicodeDecodeError as e:
        raise ParseError("Failed to decode null_terminated_str") from e
    return decoded, new_offset


def block_header(data: bytes, offset: int, header: str):
    expected = header.encode("utf-8")
    if data[offset: offset + len(expected)] != expected:
        raise ParseError(f"Expected header '{header}' not found")
    offset += len(expected)
    if data[offset: offset + 1] != b'\0':
        raise ParseError("Expected null terminator after header")
    offset += 1
    return offset

# --------------------------
# Parser Functions (from src/parser.rs)
# --------------------------


def map_block_info(data: bytes, offset: int):
    header_str, offset = null_terminated_str(data, offset)
    revision_number, offset = parse_le_u16(data, offset)
    size, offset = parse_le_i32(data, offset)
    bi = BlockInfo(identifier=header_str, revision_number=revision_number, size=size)
    return bi, offset


def map_block(data: bytes, offset: int = 0):
    offset = block_header(data, offset, "Map")
    revision_number, offset = parse_le_u16(data, offset)
    block_size, offset = parse_le_i32(data, offset)
    block_count, offset = parse_le_i16(data, offset)
    blocks_to_read = block_count - 1
    if blocks_to_read < 0:
        raise ParseError("Invalid block count in map_block")
    block_infos = []
    for _ in range(blocks_to_read):
        bi, offset = map_block_info(data, offset)
        block_infos.append(bi)
    mb = MapBlock(
        revision_number=revision_number,
        block_size=block_size,
        block_count=block_count,
        block_info=block_infos
    )
    return mb, offset


def general_parameters_block(data: bytes, offset: int):
    offset = block_header(data, offset, "GenParams")
    language_code, offset = fixed_length_str(data, offset, 2)
    cable_id, offset = null_terminated_str(data, offset)
    fiber_id, offset = null_terminated_str(data, offset)
    fiber_type, offset = parse_le_i16(data, offset)
    nominal_wavelength, offset = parse_le_i16(data, offset)
    originating_location, offset = null_terminated_str(data, offset)
    terminating_location, offset = null_terminated_str(data, offset)
    cable_code, offset = null_terminated_str(data, offset)
    current_data_flag, offset = fixed_length_str(data, offset, 2)
    user_offset, offset = parse_le_i32(data, offset)
    user_offset_distance, offset = parse_le_i32(data, offset)
    operator_str, offset = null_terminated_str(data, offset)
    comment, offset = null_terminated_str(data, offset)
    gp = GeneralParametersBlock(
        language_code=language_code,
        cable_id=cable_id,
        fiber_id=fiber_id,
        fiber_type=fiber_type,
        nominal_wavelength=nominal_wavelength,
        originating_location=originating_location,
        terminating_location=terminating_location,
        cable_code=cable_code,
        current_data_flag=current_data_flag,
        user_offset=user_offset,
        user_offset_distance=user_offset_distance,
        operator=operator_str,
        comment=comment
    )
    return gp, offset


def supplier_parameters_block(data: bytes, offset: int):
    offset = block_header(data, offset, "SupParams")
    supplier_name, offset = null_terminated_str(data, offset)
    otdr_mainframe_id, offset = null_terminated_str(data, offset)
    otdr_mainframe_sn, offset = null_terminated_str(data, offset)
    optical_module_id, offset = null_terminated_str(data, offset)
    optical_module_sn, offset = null_terminated_str(data, offset)
    software_revision, offset = null_terminated_str(data, offset)
    other, offset = null_terminated_str(data, offset)
    sp = SupplierParametersBlock(
        supplier_name=supplier_name,
        otdr_mainframe_id=otdr_mainframe_id,
        otdr_mainframe_sn=otdr_mainframe_sn,
        optical_module_id=optical_module_id,
        optical_module_sn=optical_module_sn,
        software_revision=software_revision,
        other=other
    )
    return sp, offset


def fixed_parameters_block(data: bytes, offset: int):
    offset = block_header(data, offset, "FxdParams")
    date_time_stamp, offset = parse_le_u32(data, offset)
    units_of_distance, offset = fixed_length_str(data, offset, 2)
    actual_wavelength, offset = parse_le_i16(data, offset)
    acquisition_offset, offset = parse_le_i32(data, offset)
    acquisition_offset_distance, offset = parse_le_i32(data, offset)
    total_n_pulse_widths_used, offset = parse_le_i16(data, offset)
    pulse_widths_used = []
    for _ in range(total_n_pulse_widths_used):
        pw, offset = parse_le_i16(data, offset)
        pulse_widths_used.append(pw)
    data_spacing = []
    for _ in range(total_n_pulse_widths_used):
        ds, offset = parse_le_i32(data, offset)
        data_spacing.append(ds)
    n_data_points_for_pulse_widths_used = []
    for _ in range(total_n_pulse_widths_used):
        ndp, offset = parse_le_i32(data, offset)
        n_data_points_for_pulse_widths_used.append(ndp)
    group_index, offset = parse_le_i32(data, offset)
    backscatter_coefficient, offset = parse_le_i16(data, offset)
    number_of_averages, offset = parse_le_i32(data, offset)
    averaging_time, offset = parse_le_u16(data, offset)
    acquisition_range, offset = parse_le_i32(data, offset)
    acquisition_range_distance, offset = parse_le_i32(data, offset)
    front_panel_offset, offset = parse_le_i32(data, offset)
    noise_floor_level, offset = parse_le_u16(data, offset)
    noise_floor_scale_factor, offset = parse_le_i16(data, offset)
    power_offset_first_point, offset = parse_le_u16(data, offset)
    loss_threshold, offset = parse_le_u16(data, offset)
    reflectance_threshold, offset = parse_le_u16(data, offset)
    end_of_fibre_threshold, offset = parse_le_u16(data, offset)
    trace_type, offset = fixed_length_str(data, offset, 2)
    window_coordinate_1, offset = parse_le_i32(data, offset)
    window_coordinate_2, offset = parse_le_i32(data, offset)
    window_coordinate_3, offset = parse_le_i32(data, offset)
    window_coordinate_4, offset = parse_le_i32(data, offset)
    fp = FixedParametersBlock(
        date_time_stamp=date_time_stamp,
        units_of_distance=units_of_distance,
        actual_wavelength=actual_wavelength,
        acquisition_offset=acquisition_offset,
        acquisition_offset_distance=acquisition_offset_distance,
        total_n_pulse_widths_used=total_n_pulse_widths_used,
        pulse_widths_used=pulse_widths_used,
        data_spacing=data_spacing,
        n_data_points_for_pulse_widths_used=n_data_points_for_pulse_widths_used,
        group_index=group_index,
        backscatter_coefficient=backscatter_coefficient,
        number_of_averages=number_of_averages,
        averaging_time=averaging_time,
        acquisition_range=acquisition_range,
        acquisition_range_distance=acquisition_range_distance,
        front_panel_offset=front_panel_offset,
        noise_floor_level=noise_floor_level,
        noise_floor_scale_factor=noise_floor_scale_factor,
        power_offset_first_point=power_offset_first_point,
        loss_threshold=loss_threshold,
        reflectance_threshold=reflectance_threshold,
        end_of_fibre_threshold=end_of_fibre_threshold,
        trace_type=trace_type,
        window_coordinate_1=window_coordinate_1,
        window_coordinate_2=window_coordinate_2,
        window_coordinate_3=window_coordinate_3,
        window_coordinate_4=window_coordinate_4
    )
    return fp, offset


def key_event(data: bytes, offset: int):
    event_number, offset = parse_le_i16(data, offset)
    event_propogation_time, offset = parse_le_i32(data, offset)
    attenuation_coefficient_lead_in_fiber, offset = parse_le_i16(data, offset)
    event_loss, offset = parse_le_i16(data, offset)
    event_reflectance, offset = parse_le_i32(data, offset)
    event_code, offset = fixed_length_str(data, offset, 6)
    loss_measurement_technique, offset = fixed_length_str(data, offset, 2)
    marker_location_1, offset = parse_le_i32(data, offset)
    marker_location_2, offset = parse_le_i32(data, offset)
    marker_location_3, offset = parse_le_i32(data, offset)
    marker_location_4, offset = parse_le_i32(data, offset)
    marker_location_5, offset = parse_le_i32(data, offset)
    comment, offset = null_terminated_str(data, offset)
    ke = KeyEvent(
        event_number=event_number,
        event_propogation_time=event_propogation_time,
        attenuation_coefficient_lead_in_fiber=attenuation_coefficient_lead_in_fiber,
        event_loss=event_loss,
        event_reflectance=event_reflectance,
        event_code=event_code,
        loss_measurement_technique=loss_measurement_technique,
        marker_location_1=marker_location_1,
        marker_location_2=marker_location_2,
        marker_location_3=marker_location_3,
        marker_location_4=marker_location_4,
        marker_location_5=marker_location_5,
        comment=comment
    )
    return ke, offset


def last_key_event(data: bytes, offset: int):
    event_number, offset = parse_le_i16(data, offset)
    event_propogation_time, offset = parse_le_i32(data, offset)
    attenuation_coefficient_lead_in_fiber, offset = parse_le_i16(data, offset)
    event_loss, offset = parse_le_i16(data, offset)
    event_reflectance, offset = parse_le_i32(data, offset)
    event_code, offset = fixed_length_str(data, offset, 6)
    loss_measurement_technique, offset = fixed_length_str(data, offset, 2)
    marker_location_1, offset = parse_le_i32(data, offset)
    marker_location_2, offset = parse_le_i32(data, offset)
    marker_location_3, offset = parse_le_i32(data, offset)
    marker_location_4, offset = parse_le_i32(data, offset)
    marker_location_5, offset = parse_le_i32(data, offset)
    comment, offset = null_terminated_str(data, offset)
    end_to_end_loss, offset = parse_le_i32(data, offset)
    end_to_end_marker_position_1, offset = parse_le_i32(data, offset)
    end_to_end_marker_position_2, offset = parse_le_i32(data, offset)
    optical_return_loss, offset = parse_le_u16(data, offset)
    optical_return_loss_marker_position_1, offset = parse_le_i32(data, offset)
    optical_return_loss_marker_position_2, offset = parse_le_i32(data, offset)
    lke = LastKeyEvent(
        event_number=event_number,
        event_propogation_time=event_propogation_time,
        attenuation_coefficient_lead_in_fiber=attenuation_coefficient_lead_in_fiber,
        event_loss=event_loss,
        event_reflectance=event_reflectance,
        event_code=event_code,
        loss_measurement_technique=loss_measurement_technique,
        marker_location_1=marker_location_1,
        marker_location_2=marker_location_2,
        marker_location_3=marker_location_3,
        marker_location_4=marker_location_4,
        marker_location_5=marker_location_5,
        comment=comment,
        end_to_end_loss=end_to_end_loss,
        end_to_end_marker_position_1=end_to_end_marker_position_1,
        end_to_end_marker_position_2=end_to_end_marker_position_2,
        optical_return_loss=optical_return_loss,
        optical_return_loss_marker_position_1=optical_return_loss_marker_position_1,
        optical_return_loss_marker_position_2=optical_return_loss_marker_position_2
    )
    return lke, offset


def key_events_block(data: bytes, offset: int):
    offset = block_header(data, offset, "KeyEvents")
    number_of_key_events, offset = parse_le_i16(data, offset)
    n_key_events = number_of_key_events - 1
    if n_key_events < 0:
        raise ParseError("Invalid number of key events")
    key_events_list = []
    for _ in range(n_key_events):
        ke, offset = key_event(data, offset)
        key_events_list.append(ke)
    lke, offset = last_key_event(data, offset)
    ke_block = KeyEvents(
        number_of_key_events=number_of_key_events,
        key_events=key_events_list,
        last_key_event=lke
    )
    return ke_block, offset


def landmark(data: bytes, offset: int):
    # Note: The Rust version calls block_header with "LnkParams" here.
    # This implementation does so as well.
    offset = block_header(data, offset, "LnkParams")
    landmark_number, offset = parse_le_i16(data, offset)
    landmark_code, offset = fixed_length_str(data, offset, 2)
    landmark_location, offset = parse_le_i32(data, offset)
    related_event_number, offset = parse_le_i16(data, offset)
    gps_longitude, offset = parse_le_i32(data, offset)
    gps_latitude, offset = parse_le_i32(data, offset)
    fiber_correction_factor_lead_in_fiber, offset = parse_le_i16(data, offset)
    sheath_marker_entering_landmark, offset = parse_le_i32(data, offset)
    sheath_marker_leaving_landmark, offset = parse_le_i32(data, offset)
    units_of_sheath_marks_leaving_landmark, offset = fixed_length_str(data, offset, 2)
    mode_field_diameter_leaving_landmark, offset = parse_le_i16(data, offset)
    comment, offset = null_terminated_str(data, offset)
    lm = Landmark(
        landmark_number=landmark_number,
        landmark_code=landmark_code,
        landmark_location=landmark_location,
        related_event_number=related_event_number,
        gps_longitude=gps_longitude,
        gps_latitude=gps_latitude,
        fiber_correction_factor_lead_in_fiber=fiber_correction_factor_lead_in_fiber,
        sheath_marker_entering_landmark=sheath_marker_entering_landmark,
        sheath_marker_leaving_landmark=sheath_marker_leaving_landmark,
        units_of_sheath_marks_leaving_landmark=units_of_sheath_marks_leaving_landmark,
        mode_field_diameter_leaving_landmark=mode_field_diameter_leaving_landmark,
        comment=comment
    )
    return lm, offset


def link_parameters_block(data: bytes, offset: int):
    offset = block_header(data, offset, "LnkParams")
    number_of_landmarks, offset = parse_le_i16(data, offset)
    landmarks_list = []
    for _ in range(number_of_landmarks):
        lm, offset = landmark(data, offset)
        landmarks_list.append(lm)
    lp = LinkParameters(
        number_of_landmarks=number_of_landmarks,
        landmarks=landmarks_list
    )
    return lp, offset


def data_points_at_scale_factor(data: bytes, offset: int):
    n_points, offset = parse_le_i32(data, offset)
    scale_factor, offset = parse_le_i16(data, offset)
    data_points_list = []
    for _ in range(n_points):
        dp, offset = parse_le_u16(data, offset)
        data_points_list.append(dp)
    dpsf = DataPointsAtScaleFactor(
        n_points=n_points,
        scale_factor=scale_factor,
        data=data_points_list
    )
    return dpsf, offset


def data_points_block(data: bytes, offset: int):
    offset = block_header(data, offset, "DataPts")
    number_of_data_points, offset = parse_le_i32(data, offset)
    total_number_scale_factors_used, offset = parse_le_i16(data, offset)
    scale_factors = []
    for _ in range(total_number_scale_factors_used):
        sf, offset = data_points_at_scale_factor(data, offset)
        scale_factors.append(sf)
    dp = DataPoints(
        number_of_data_points=number_of_data_points,
        total_number_scale_factors_used=total_number_scale_factors_used,
        scale_factors=scale_factors
    )
    return dp, offset


def proprietary_block(data: bytes, offset: int):
    # Reads a null-terminated header string; any remaining data is stored as-is.
    header, offset = null_terminated_str(data, offset)
    pb = ProprietaryBlock(header=header, data=data[offset:])
    # For our purposes we return all remaining data as the proprietary payload.
    return pb, len(data)

# --------------------------
# High-level File Parser
# --------------------------


def extract_block_data(data: bytes, header: str, map_blk: MapBlock) -> bytes:
    # Calculate the offset of a given block by walking the MapBlock’s info.
    offset = map_blk.block_size
    length = 0
    for bi in map_blk.block_info:
        length = bi.size
        if bi.identifier == header:
            break
        new_offset = offset + bi.size
        if new_offset < offset:  # check for overflow (the Rust code does this)
            raise ParseError("Error with block data – offset value is incorrect")
        offset = new_offset
    final_byte = offset + length
    if offset > len(data) or final_byte > len(data):
        raise ParseError("Error with block data – reported block position or length is incorrect")
    return data[offset:final_byte]


def parse_file(data: bytes) -> SORFile:
    # Parse the MapBlock first (which describes the locations/sizes of all blocks)
    map_blk, _ = map_block(data, 0)
    general_parameters: Optional[GeneralParametersBlock] = None
    supplier_parameters: Optional[SupplierParametersBlock] = None
    fixed_parameters: Optional[FixedParametersBlock] = None
    key_events: Optional[KeyEvents] = None
    link_parameters: Optional[LinkParameters] = None
    data_points: Optional[DataPoints] = None
    proprietary_blocks: List[ProprietaryBlock] = []

    # Iterate over each block in the MapBlock
    for bi in map_blk.block_info:
        try:
            block_data = extract_block_data(data, bi.identifier, map_blk)
        except ParseError:
            block_data = b""
        local_offset = 0
        if bi.identifier == "SupParams":
            sp, _ = supplier_parameters_block(block_data, local_offset)
            supplier_parameters = sp
        elif bi.identifier == "GenParams":
            gp, _ = general_parameters_block(block_data, local_offset)
            general_parameters = gp
        elif bi.identifier == "FxdParams":
            fp, _ = fixed_parameters_block(block_data, local_offset)
            fixed_parameters = fp
        elif bi.identifier == "KeyEvents":
            ke, _ = key_events_block(block_data, local_offset)
            key_events = ke
        elif bi.identifier == "LnkParams":
            # Unimplemented due to lack of test data; one could call link_parameters_block here.
            pass
        elif bi.identifier == "DataPts":
            dp, _ = data_points_block(block_data, local_offset)
            data_points = dp
        elif bi.identifier == "Cksum":
            # Checksum block – no parsing performed here.
            pass
        else:
            pb, _ = proprietary_block(block_data, local_offset)
            proprietary_blocks.append(pb)

    sor = SORFile(
        map=map_blk,
        general_parameters=general_parameters,
        supplier_parameters=supplier_parameters,
        fixed_parameters=fixed_parameters,
        key_events=key_events,
        link_parameters=link_parameters,
        data_points=data_points,
        proprietary_blocks=proprietary_blocks
    )
    return sor


def encode_null_terminated_str(b: bytearray, s: str):
    b.extend(s.encode('utf-8'))
    b.append(0)


def encode_fixed_length_str(b: bytearray, s: str, length: int):
    # For each character, ensure it encodes to exactly one byte
    bytes_list = []
    for c in s:
        encoded = c.encode('utf-8')
        if len(encoded) != 1:
            raise Exception("A character in a fixed-length string requires more than one byte")
        bytes_list.append(encoded[0])
    b.extend(bytes(bytes_list))


def encode_le_i16(b: bytearray, val: int):
    b.extend(struct.pack('<h', val))


def encode_le_i32(b: bytearray, val: int):
    b.extend(struct.pack('<i', val))

# === Helper function to add a block (replacing the add_block! macro) ===


def add_block(b: bytearray, m: MapBlock, nm: MapBlock, block, gen_block_func, block_id: str):
    if block is not None:
        try:
            block_bytes = gen_block_func()
        except Exception as err:
            raise Exception(err)
        # Find the block info in the original map
        found = None
        for x in m.block_info:
            if x.identifier == block_id:
                found = x
                break
        if found is None:
            raise Exception("BlockInfo block is missing for one of your blocks in the Map!")
        new_block_info = BlockInfo(
            identifier=block_id,
            revision_number=found.revision_number,
            size=len(block_bytes)
        )
        nm.block_info.append(new_block_info)
        nm.block_count += 1
        # Each block contributes: header length + null terminator + 2-byte revision + 4-byte size
        nm.block_size += (len(block_id) + 1 + 2 + 4)
        b.extend(block_bytes)

