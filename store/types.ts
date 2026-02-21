export interface Participant {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  participants: Participant[];
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description: string;
  amount: number;
  payerId: string;
  /** Leer = auf alle Teilnehmer aufteilen */
  splitBetweenIds: string[];
}

export interface Balance {
  participantId: string;
  balance: number; // positiv = bekommt Geld, negativ = schuldet
}

export interface Debt {
  fromId: string;
  toId: string;
  amount: number;
}
