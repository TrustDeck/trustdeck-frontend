import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shared } from 'use-broadcast-ts'

type ProjectStore = {
    projectName: string;
    setProjectName: (name: string) => void;
};

const useProjectStore = create<ProjectStore>()(
    subscribeWithSelector(
        shared(
            (set) => ({
                projectName: '',
                setProjectName: (name: string) => set({ projectName: name }),
            })
        )
    )
);

export default useProjectStore
