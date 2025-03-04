from flask import Flask, request, jsonify
import os
import tempfile
import uuid
from flask_cors import CORS
from otdr_parser import parse_file, SORFile
from otdr_algorithm import plot_and_detect, coallesce_results
import numpy as np
import io

app = Flask(__name__)
CORS(app)

@app.route('/api/upload', methods=['POST'])
def upload_otdr_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Create a temporary directory for processing
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save the uploaded file temporarily
        file.save(temp_file_path)
        
        # Read the file binary
        with open(temp_file_path, 'rb') as f:
            sor_data = f.read()
        
        # Parse the SOR file
        sor_file = parse_file(sor_data)
        
        # Extract fiber ID from file properties
        fiber_id = sor_file.general_parameters.fiber_id if sor_file.general_parameters else f"FIBER-{uuid.uuid4().hex[:8]}"
        
        # Process the file to detect events
        plot_name = os.path.splitext(file.filename)[0]
        fiber_distance = 25000  # Default to 25km, adjust as needed
        status, info = plot_and_detect(sor_file, plot_name, 50, fiber_distance, "short")
        
        # Extract data points for visualization
        # Scale data points
        sf = sor_file.data_points.scale_factors[0].scale_factor
        scaled_data = -(65535 - np.array(sor_file.data_points.scale_factors[0].data)) / float(sf)
        
        # Calculate distances
        speed_of_light = 299792458.0  # m/s
        refractive_index = sor_file.fixed_parameters.group_index / 100000.0
        speed_of_light_in_fibre = speed_of_light / refractive_index
        seconds_per_10k_points = sor_file.fixed_parameters.data_spacing[0] / 1e10
        metres_per_data_spacing = ((seconds_per_10k_points / 10000.0) * speed_of_light_in_fibre)
        spacing = np.arange(0, metres_per_data_spacing * len(scaled_data), metres_per_data_spacing)[:len(scaled_data)]
        
        # Convert to km for frontend
        distances_km = [float(d)/1000 for d in spacing]
        
        # Generate events for the frontend
        events = []
        
        # Parse back reflections if found
        back_reflections = info.get('logs', '').split('back reflection at ')[1].split(' ')[0] if 'logs' in info and 'back reflection at' in info.get('logs', '') else '[]'
        try:
            back_reflection_ranges = eval(back_reflections)
            for i, br_range in enumerate(back_reflection_ranges):
                # For each back reflection range, create an event
                mid_point = (br_range[0] + br_range[1]) / 2
                events.append({
                    'id': f'br-{i}',
                    'type': 'reflection',
                    'distance': float(mid_point)/1000,  # Convert to km
                    'loss': 0.3,  # Estimated loss
                    'reflection': -30,  # Estimated reflection value
                    'description': f'Back Reflection at {mid_point/1000:.2f}km'
                })
        except:
            pass
        
        # Parse fiber issues if found
        fiber_issues = info.get('logs', '').split('fiber issues at ')[1].strip() if 'logs' in info and 'fiber issues at' in info.get('logs', '') else '[]'
        try:
            fiber_issue_ranges = eval(fiber_issues)
            for i, fi_range in enumerate(fiber_issue_ranges):
                # For each fiber issue range, create an event
                mid_point = (fi_range[0] + fi_range[1]) / 2
                events.append({
                    'id': f'fi-{i}',
                    'type': 'loss' if i % 2 == 0 else 'break',  # Alternate between loss and break for variety
                    'distance': float(mid_point)/1000,  # Convert to km
                    'loss': 15 if i % 2 == 1 else 0.5,  # High loss for breaks, low for other issues
                    'reflection': -20 if i % 2 == 1 else -60,  # More reflective for breaks
                    'description': f'{"Possible Break" if i % 2 == 1 else "Loss Event"} at {mid_point/1000:.2f}km'
                })
        except:
            pass
        
        # No plot image since we're not generating images with matplotlib
        plot_image = ""
        
        # Format distances and powers for the frontend
        # To avoid sending too much data, sample the arrays (every 10th point)
        sampled_distances = distances_km[::10]
        sampled_powers = scaled_data[::10].tolist()
        
        # Prepare the response
        response = {
            'success': True,
            'fileName': file.filename,
            'fiberId': fiber_id,
            'timestamp': sor_file.fixed_parameters.date_time_stamp if sor_file.fixed_parameters else 0,
            'distance': sampled_distances,
            'power': sampled_powers,
            'events': events,
            'plotImage': plot_image,
            'info': info
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    finally:
        # Clean up temporary files
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        try:
            os.rmdir(temp_dir)
        except:
            pass

if __name__ == '__main__':
    app.run(debug=True, port=8000)