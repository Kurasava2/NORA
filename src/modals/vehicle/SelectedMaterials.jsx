import React from 'react'

export default function SelectedMaterials({ rule, moveMaterial, removeMaterial }) {
  if (!rule.materials?.length) {
    return <div className="muted">Материалы пока не выбраны.</div>
  }

  return (
    <div className="selected-materials">
      {rule.materials.map((materialName, materialIndex) => (
        <div className="selected-material" key={materialName}>
          <span>{materialIndex + 1}. {materialName}</span>
          <div>
            <button
              type="button"
              disabled={materialIndex === 0}
              onClick={() => moveMaterial(materialIndex, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={materialIndex === rule.materials.length - 1}
              onClick={() => moveMaterial(materialIndex, 1)}
            >
              ↓
            </button>
            <button type="button" onClick={() => removeMaterial(materialName)}>×</button>
          </div>
        </div>
      ))}
    </div>
  )
}
