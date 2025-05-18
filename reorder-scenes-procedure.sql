-- Procedimiento almacenado para reordenar escenas en una transacción
-- NOTA: Este archivo se mantiene como referencia, pero no se utiliza actualmente
-- ya que la funcionalidad se implementa directamente en la API

CREATE OR REPLACE FUNCTION reorder_scenes(p_project_id UUID, p_scene_ids UUID[])
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    scene_id UUID;
BEGIN
    -- Iniciar una transacción para garantizar que todos los cambios se apliquen o ninguno
    BEGIN
        -- Recorrer el array de IDs y actualizar el order_index de cada escena
        FOR i IN 1..array_length(p_scene_ids, 1) LOOP
            scene_id := p_scene_ids[i];
            
            -- Actualizar el order_index de la escena
            UPDATE scenes
            SET order_index = i - 1
            WHERE id = scene_id AND project_id = p_project_id;
            
            -- Verificar si la actualización fue exitosa
            IF NOT FOUND THEN
                RAISE EXCEPTION 'No se encontró la escena con ID % en el proyecto %', scene_id, p_project_id;
            END IF;
        END LOOP;
        
        -- Actualizar la fecha de modificación del proyecto
        UPDATE projects
        SET updated_at = NOW()
        WHERE id = p_project_id;
        
        -- Si llegamos aquí, todo salió bien y la transacción se confirma automáticamente
    EXCEPTION
        WHEN OTHERS THEN
            -- Si ocurre algún error, la transacción se revierte automáticamente
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;
