import React from 'react'
import { Button, Field } from '../../components/ui.jsx'
import { countForm, RU_FORMS } from '../../lib/ru.js'

export default function TemplateSettingsField({ template, onChoose, onRemove }) {
  const templateDescription = template?.info
    ? `${template.info.has3263 ? 'эталон 3263 · ' : ''}${countForm(
        template.info.sheetNames?.length || 0,
        RU_FORMS.sheet,
      )}`
    : 'Загрузите исходную книгу .xlsx'

  return (
    <Field className="span-2" label="Excel-шаблон ведомости">
      <div className="template-card">
        <div>
          <b>{template?.name || 'Шаблон не загружен'}</b>
          <small>{templateDescription}</small>
        </div>
        <div className="toolbar">
          <Button type="button" onClick={onChoose}>Загрузить / заменить</Button>
          {template && <Button type="button" danger onClick={onRemove}>Удалить</Button>}
        </div>
      </div>
    </Field>
  )
}
