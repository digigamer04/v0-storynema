-- Función SQL almacenada para invertir el orden de las escenas
-- Esta función se ejecuta directamente en la base de datos, evitando problemas de red/middleware
CREATE OR REPLACE FUNCTION flip_scenes_order(p_project_id UUID, p_scene_ids UUID[], p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_count INTEGER;
    v_project_user_id UUID;
    v_i INTEGER;
    v_scene_id UUID;
BEGIN
    -- Verificar que el proyecto existe y pertenece al usuario
    SELECT user_id INTO v_project_user_id 
    FROM projects 
    WHERE id = p_project_id;
    
    IF v_project_user_id IS NULL THEN
        RAISE EXCEPTION 'Proyecto no encontrado';
    END IF;
    
    IF v_project_user_id <> p_user_id THEN
        RAISE EXCEPTION 'No tienes permiso para modificar este proyecto';
    END IF;
    
    -- Mover todas las escenas a posiciones temporales negativas para evitar conflictos de unicidad
    UPDATE scenes
    SET position = -position
    WHERE project_id = p_project_id;
    
    -- Actualizar las posiciones según el nuevo orden invertido
    FOR v_i IN 1..array_length(p_scene_ids, 1) LOOP
        v_scene_id := p_scene_ids[v_i];
        
        UPDATE scenes
        SET position = v_i
        WHERE id = v_scene_id AND project_id = p_project_id;
    END LOOP;
    
    -- Actualizar cualquier escena que todavía tenga posición negativa
    UPDATE scenes
    SET position = ABS(position) + array_length(p_scene_ids, 1)
    WHERE project_id = p_project_id AND position < 0;
    
    -- Verificar que todas las escenas tienen posiciones positivas
    SELECT COUNT(*) INTO v_count
    FROM scenes
    WHERE project_id = p_project_id AND position <= 0;
    
    IF v_count > 0 THEN
        RAISE WARNING 'Hay % escenas con posiciones no válidas después de la actualización', v_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
