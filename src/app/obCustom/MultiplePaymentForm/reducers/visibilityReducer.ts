import { VisibilityState } from '../types';

import { Action } from './errorReducer';

export enum VisibilityActions {
    toggleNewCard = 'TOGGLE_NEW',
    toggleExistingCard = 'TOGGLE_EXISTING',
    hideNewCard = 'HIDE_NEW',
    showNewCard = 'SHOW_NEW',
    hideExistingCard = 'HIDE_EXISTING',
    showExistingCard = 'SHOW_EXISTING',
}

export const visibilityReducer = (state: VisibilityState, action: Action) => {
    const { type } = action;

    switch (type) {
        case VisibilityActions.toggleExistingCard:
            const { existingCards } = state;

            return {
                ...state,
                existingCards: !existingCards,
            };
        case VisibilityActions.toggleNewCard:
            const { newCard } = state;

            return {
                ...state,
                newCard: !newCard,
            };
        case VisibilityActions.hideExistingCard:
            return {
                ...state,
                existingCards: false,
            };
        case VisibilityActions.showExistingCard:
            return {
                ...state,
                existingCards: true,
            };
        case VisibilityActions.hideNewCard:
            return {
                ...state,
                newCard: false,
            };
        case VisibilityActions.showNewCard:
            return {
                ...state,
                newCard: true,
            };
        default:
            return state;
    }
};
