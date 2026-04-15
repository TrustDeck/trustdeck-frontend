import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper } from 'primereact/stepper'
import { StepperPanel } from 'primereact/stepperpanel'
import Panel from '@component/common/Panel'
import CustomCard from '@component/common/CustomCard'
import {
  PlusIcon,
  PencilSquareIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import CustomFloatLabel from '../../core/components/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import useProjectInputStore from './stores/InputStore'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { useTranslation } from 'react-i18next'
import RegistrationGroupOption from '../groups/components/RegistrationGroupOption'
import SecondaryButton from '@component/form/buttons/SecondaryButton'
import ProjectService from './services/ProjectService'
import { Toast } from 'primereact/toast';
import useProjectStore from '../../core/stores/ProjectStore'

export default function NewProject() {
  const stepperRef = useRef<any | null>(null)
  const toastRef = useRef<Toast>(null)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [projectType, setProjectType] = useState<string | null>(null)
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setSelectedProject, setJustCreated, setEntities, setEntityAttributes } =
    useProjectStore()

  const {
    projectName,
    projectAbbreviation,
    startDate,
    endDate,
    setProjectName,
    setProjectAbbreviation,
    setStartDate,
    setEndDate
  } = useProjectInputStore()

  function handleNext() {
    setCurrentStep((prev) => prev + 1)
    stepperRef.current?.nextCallback()
  }

  function handlePrev() {
    setCurrentStep((prev) => prev - 1)
    stepperRef.current?.prevCallback()
  }

  function handleTypeClick(type: string) {
    setProjectType(type)
    handleNext()
  }

  function toggleSelection(entity: string) {
    setSelectedEntities((prev) =>
      prev.includes(entity)
        ? prev.filter((e) => e !== entity)
        : [...prev, entity]
    )
  }


  async function postProject() {
    const payload = {
      storeEntities: true, 
      createPseudonyms: projectType === 'both',
      name: projectName,
      description: `This is the project ${projectName}`,
      abbreviation: projectAbbreviation,
      startDate: startDate ? startDate.toISOString() : 'test',
      endDate: endDate ? endDate.toISOString() : 'test',
      entityTypes: selectedEntities
    }
    try {
      const createdProject = await ProjectService.postProject(payload)
      setSelectedProject({ abbreviation: createdProject.abbreviation, name: createdProject.name })
      setJustCreated(true)
      try {
        const projectEntities = await ProjectService.getProjectEntities()
        setEntities(projectEntities)
      } catch (error) {
        console.error('Failed to load project entities', error)
        setEntities([])
      }
      try {
        setEntityAttributes(ProjectService.getEntityAttributes())
      } catch (e) {
        console.error(e)
      }
      toastRef.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Project created successfully',
        life: 2000
      })
      setTimeout(() => {
        navigate('/group-management')
      }, 3000)

    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Panel>
      <Toast ref={toastRef} />  
      <Stepper ref={stepperRef} orientation="vertical" activeStep={currentStep}>
        {/* Step 1: Choose project type */}
        <StepperPanel header={t('projects:forWhat')}>
          <div className="sm:flex sm:space-y-0 justify-around space-y-4 my-4 gap-4">
            <CustomCard
              title={t('projects:register')}
              icon={<PlusIcon />}
              onClick={() => handleTypeClick('register')}
              className="flex-1"
            />

            <CustomCard
              title="Register + Pseudonym"
              icon={<PencilSquareIcon />}
              onClick={() => handleTypeClick('both')}
              className="flex-1"
            />
          </div>
        </StepperPanel>

        {/* Step 2: Project configuration */}
        <StepperPanel header="Project data">
          <div className="sm:form-grid sm:space-y-0 space-y-3">
            <CustomFloatLabel
              id="projectName"
              value={projectName}
              placeholder={t('projects:projectName')}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <CustomFloatLabel
              id="projectAbbreviation"
              value={projectAbbreviation}
              placeholder={t('projects:projectAbbreviation')}
              onChange={(e) => setProjectAbbreviation(e.target.value)}
            />
            <CustomCalendar
              id="startdate"
              placeholder={t('projects:startDate')}
              value={startDate}
              onChange={(e) => setStartDate(e.value)}
            />
            <CustomCalendar
              id="startdate"
              placeholder={t('projects:endDate')}
              value={endDate}
              onChange={(e) => setEndDate(e.value)}
            />
            <div className="flex py-4 space-x-4">
              <PrimaryOutlinedButton
                label={
                  <span className="flex items-center gap-2">
                    {t('projects:buttons.back')}
                    <ArrowUpIcon className="h-5 w-5" />
                  </span>
                }
                onClick={() => handlePrev()}
              />
              <PrimaryButton
                label={
                  <span className="flex items-center gap-2">
                    {t('projects:buttons.next')}
                    <ArrowDownIcon className="h-5 w-5" />
                  </span>
                }
                onClick={() => handleNext()}
              />
            </div>
          </div>
        </StepperPanel>

        {/* Step 3: Entity selection */}
        <StepperPanel header={t('projects:selectEntities')}>
          <div className="sm:flex sm:space-y-0 justify-around space-y-4 my-4">
            <CustomCard
              title="Person"
              icon={<UserIcon />}
              className={`mt-6 cursor-pointer`}
              bgColor={
                selectedEntities.includes('person') ? 'bg-blue-200' : 'bg-sidebar'
              }
              onClick={() => toggleSelection('person')}
            />
            <CustomCard
              title="Bio Sample"
              icon={<BeakerIcon />}
              className={`mt-6 mb-6 cursor-pointer`}
              bgColor={
                selectedEntities.includes('biosample') ? 'bg-blue-200' : 'bg-sidebar'
              }
              onClick={() => toggleSelection('biosample')}
            />
          </div>
          <div className="flex py-4 space-x-4">
            <PrimaryOutlinedButton
              label={
                <span className="flex items-center gap-2">
                  {t('projects:buttons.back')}
                  <ArrowUpIcon className="h-5 w-5" />
                </span>
              }
              onClick={() => handlePrev()}
            />
            {projectType === 'both' && (
              <PrimaryButton
                label={
                  <span className="flex items-center gap-2">
                    {t('projects:buttons.next')}
                    <ArrowDownIcon className="h-5 w-5" />
                  </span>
                }
                onClick={() => handleNext()}
              />
            )}
            {projectType !== 'both' && (
              <SecondaryButton
                label={t('projects:createProject')}
                onClick={() => postProject()} 
              />
            )}
          </div>
        </StepperPanel>

        {projectType === 'both' && (
          <StepperPanel header={t('projects:pseudonymConfig')}>
            <div className="flex flex-col items-center gap-4">
              <RegistrationGroupOption />
            </div>
            <div className="flex py-4 space-x-4">
              <PrimaryOutlinedButton
                label={
                  <span className="flex items-center gap-2">
                    {t('projects:buttons.back')}
                    <ArrowUpIcon className="h-5 w-5" />
                  </span>
                }
                onClick={() => handlePrev()}
              />
            </div>
          </StepperPanel>
        )}
      </Stepper>
    </Panel>
  )
}
