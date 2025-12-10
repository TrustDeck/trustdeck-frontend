import { create } from 'zustand'
import type { MutableRefObject } from 'react'

// This store stores the ref and functions for controlling the stepper in the pseudonymization flow. It needs to be stored in Zustand so that the functions can be available in the SearchResult component. 

type StepperControlState = {
  currentStep: number
  // generischer Ref-Typ statt spezifischem PrimeReact-Typ
  stepperRef: MutableRefObject<any | null>
  setStepperRef: (ref: MutableRefObject<any | null>) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  previousStep: () => void
}

const useStepperControlStore = create<StepperControlState>((set, get) => ({
  currentStep: 1,
  // initialisiere als generisches Ref
  stepperRef: { current: null } as MutableRefObject<any | null>,
  setStepperRef: (ref) => set({ stepperRef: ref }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const { stepperRef } = get()
    const ref = stepperRef.current
    if (ref) {
      const next = (ref?.getActiveStep?.() ?? 0) + 1
      ref?.setActiveStep?.(next)
      set({ currentStep: next + 1 })
    }
  },
  previousStep: () => {
    const { stepperRef } = get()
    const ref = stepperRef.current
    if (ref) {
      const prev = Math.max(0, (ref?.getActiveStep?.() ?? 0) - 1)
      ref?.setActiveStep?.(prev)
      set({ currentStep: prev + 1 })
    }
  }
}))

export default useStepperControlStore
