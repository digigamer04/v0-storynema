-- Crear un procedimiento almacenado para invertir el orden de las escenas
CREATE OR REPLACE FUNCTION invert_scenes_order(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    max_order INTEGER;
    scene_record RECORD;
BEGIN
    -- Obtener el orden máximo actual
    SELECT MAX(order_index) INTO max_order FROM scenes WHERE project_id = p_project_id;
    
    -- Si no hay escenas, retornar falso
    IF max_order IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Invertir el orden de cada escena
    FOR scene_record IN 
        SELECT id, order_index FROM scenes WHERE project_id = p_project_id ORDER BY order_index ASC
    LOOP
        UPDATE scenes 
        SET order_index = max_order - scene_record.order_index
        WHERE id = scene_record.id;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
