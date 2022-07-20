import { LoadingState } from '../types';

import { Action } from './errorReducer';

export enum LoadingActions {
    BrainTreeLoading = 'BRAIN_TREE_LOADING',
    BrainTreeIdle = 'BRAIN_TREE_IDLE',
    EZ3Loading = 'EZ3_LOADING',
    EZ3Idle= 'EZ3_Idle',
}

export const loadingReducer = (state: LoadingState, action: Action) => {
    const { type } = action;

    switch (type) {
        case LoadingActions.BrainTreeIdle:
            return {
                ...state,
                btLoading: false,
            };
        case LoadingActions.BrainTreeLoading:
            return {
                ...state,
                btLoading: true,
            };
        case LoadingActions.EZ3Idle:
            return {
                ...state,
                ez3Loading: false,
            };
        case LoadingActions.EZ3Loading:
            return {
                ...state,
                ez3Loading: true,
            };
        default:
            return state;

    }
};
