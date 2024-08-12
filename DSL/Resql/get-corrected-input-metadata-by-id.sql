SELECT  id AS inference_id,
        input_id,
        inference_time_stamp,
        inference_text,
        jsonb_pretty(predicted_labels) AS predicted_labels,
        jsonb_pretty(corrected_labels) AS corrected_labels,
        average_predicted_classes_probability,
        average_corrected_classes_probability,
        platform
FROM "input"
WHERE is_corrected = true AND input_id=:input_id