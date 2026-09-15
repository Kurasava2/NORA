import React, { useMemo } from 'react'
import { Badge, Button, Card, PageHead } from '../components/ui.jsx'
import { countForm, RU_FORMS } from '../lib/ru.js'
import CatalogTable from './catalog/CatalogTable.jsx'

export default function CatalogView({ state, mutate, onAdd, notify, confirmAction }) {
  const fuelCount = useMemo(
    () => state.catalog.filter(material => material.category === 'Топливо').length,
    [state.catalog],
  )
  const oilCount = state.catalog.length - fuelCount
  const usageByMaterial = useMemo(() => {
    const usage = new Map()
    for (const period of state.periods) {
      for (const statement of period.statements || []) {
        for (const trip of statement.trips || []) {
          for (const materialName of Object.keys(trip.gsm || {})) {
            usage.set(materialName, (usage.get(materialName) || 0) + 1)
          }
        }
      }
    }
    return usage
  }, [state.periods])

  const usesCount = materialName => usageByMaterial.get(materialName) || 0

  const deleteMaterial = async materialName => {
    const usageCount = usesCount(materialName)
    const shouldDelete = await confirmAction({
      title: 'Удалить тип ГСМ?',
      message: `«${materialName}» будет удалён из справочника.${
        usageCount
          ? ` В ${countForm(usageCount, RU_FORMS.trip)} существующие данные останутся без изменений.`
          : ''
      }`,
      confirmText: 'Удалить',
      danger: true,
    })
    if (!shouldDelete) return

    mutate(nextState => {
      nextState.catalog = nextState.catalog.filter(material => material.name !== materialName)
    })
    notify(`Удалено из справочника: ${materialName}`)
  }

  const sortedMaterials = useMemo(
    () =>
      [...state.catalog].sort(
        (firstMaterial, secondMaterial) =>
          firstMaterial.category.localeCompare(secondMaterial.category) ||
          firstMaterial.name.localeCompare(secondMaterial.name),
      ),
    [state.catalog],
  )

  return (
    <div className="page">
      <PageHead
        title="Справочник ГСМ"
        subtitle="Все позиции можно добавлять и удалять"
        actions={<Button primary onClick={onAdd}>＋ Новый тип</Button>}
      />
      <div className="chip-row summary-chips">
        <Badge tone="blue">{countForm(fuelCount, RU_FORMS.kind)} топлива</Badge>
        <Badge>{countForm(oilCount, RU_FORMS.kind)} масла</Badge>
        <Badge tone="ok">{state.catalog.length} всего</Badge>
      </div>
      <Card>
        <CatalogTable materials={sortedMaterials} usesCount={usesCount} onDelete={deleteMaterial} />
      </Card>
    </div>
  )
}
