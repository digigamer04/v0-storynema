-- Políticas para la tabla projects
CREATE POLICY "Usuarios pueden ver sus propios proyectos"
ON projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear sus propios proyectos"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios proyectos"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios proyectos"
ON projects FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para la tabla scenes
CREATE POLICY "Usuarios pueden ver escenas de sus proyectos"
ON scenes FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios pueden crear escenas en sus proyectos"
ON scenes FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios pueden actualizar escenas de sus proyectos"
ON scenes FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Usuarios pueden eliminar escenas de sus proyectos"
ON scenes FOR DELETE
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Política temporal para desarrollo (eliminar en producción)
CREATE POLICY "Todos los usuarios autenticados pueden ver todas las escenas"
ON scenes FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Agregar estas políticas adicionales para garantizar un mejor aislamiento

-- Políticas para la tabla storyboard_shots
CREATE POLICY "Usuarios pueden ver tomas de storyboard de sus escenas"
ON storyboard_shots FOR SELECT
USING (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Usuarios pueden crear tomas de storyboard en sus escenas"
ON storyboard_shots FOR INSERT
WITH CHECK (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Usuarios pueden actualizar tomas de storyboard de sus escenas"
ON storyboard_shots FOR UPDATE
USING (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Usuarios pueden eliminar tomas de storyboard de sus escenas"
ON storyboard_shots FOR DELETE
USING (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

-- Políticas para la tabla camera_settings
CREATE POLICY "Usuarios pueden ver configuraciones de cámara de sus tomas"
ON camera_settings FOR SELECT
USING (
  shot_id IN (
    SELECT id FROM storyboard_shots WHERE scene_id IN (
      SELECT id FROM scenes WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuarios pueden crear configuraciones de cámara para sus tomas"
ON camera_settings FOR INSERT
WITH CHECK (
  shot_id IN (
    SELECT id FROM storyboard_shots WHERE scene_id IN (
      SELECT id FROM scenes WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuarios pueden actualizar configuraciones de cámara de sus tomas"
ON camera_settings FOR UPDATE
USING (
  shot_id IN (
    SELECT id FROM storyboard_shots WHERE scene_id IN (
      SELECT id FROM scenes WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuarios pueden eliminar configuraciones de cámara de sus tomas"
ON camera_settings FOR DELETE
USING (
  shot_id IN (
    SELECT id FROM storyboard_shots WHERE scene_id IN (
      SELECT id FROM scenes WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  )
);

-- Eliminar la política temporal de desarrollo
DROP POLICY IF EXISTS "Todos los usuarios autenticados pueden ver todas las escenas" ON scenes;
