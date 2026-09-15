import { useCallback, useState } from 'react'

const CLOSED_VEHICLE_MODAL = { open: false, vehicle: null }

export default function useAppModals() {
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [materialModalOpen, setMaterialModalOpen] = useState(false)
  const [vehicleModalState, setVehicleModalState] = useState(CLOSED_VEHICLE_MODAL)

  const openVehicleModal = useCallback(vehicle => {
    setVehicleModalState({ open: true, vehicle: vehicle || null })
  }, [])

  const closeVehicleModal = useCallback(() => {
    setVehicleModalState(CLOSED_VEHICLE_MODAL)
  }, [])

  return {
    periodModalOpen,
    settingsModalOpen,
    materialModalOpen,
    vehicleModalState,
    openPeriodModal: () => setPeriodModalOpen(true),
    closePeriodModal: () => setPeriodModalOpen(false),
    openSettingsModal: () => setSettingsModalOpen(true),
    closeSettingsModal: () => setSettingsModalOpen(false),
    openMaterialModal: () => setMaterialModalOpen(true),
    closeMaterialModal: () => setMaterialModalOpen(false),
    openVehicleModal,
    closeVehicleModal,
  }
}
