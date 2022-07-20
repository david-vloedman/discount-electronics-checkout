export interface ExistingCustomerState {
    isLoaded: boolean;
    customer: {
        id: string;
        savedCards: SavedCard[];
    } | null;
    currentCard: SavedCard | null;
}

export interface SavedCard {
    cardType: string;
    expirationDate?: string;
    isDefault?: boolean;
    last4?: string;
    id?: string;
}

export interface VisibilityState {
    existingCards: boolean;
    newCard: boolean;
}

export interface LoadingState {
    btLoading: boolean;
    ez3Loading: boolean;
}
