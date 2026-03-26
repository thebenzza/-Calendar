export type JobType = string;

export interface Task {
  id: string;
  title: string;
  location: string;
  date: string; // ISO string
  startTime: string;
  endTime: string;
  jobType: JobType;
  responsiblePerson: string;
  customerName: string;
  customerPhone: string;
  coordinatorPhone: string;
  dolls: {
    normal: number;
    licensedEquivalent: number;
    authenticLicensed: number;
  };
  otherEquipment: string;
  notes: string;
  cabinetCount: number;
  hasDecoration: boolean;
  decorationItems: string[];
}

export type DollType = 'normal' | 'licensedEquivalent' | 'authenticLicensed';
