/* eslint-disable import/no-internal-modules */
/* eslint-disable react/jsx-no-bind */
// @ts-nocheck
import classNames from 'classnames';
import React, { useReducer, FC } from 'react';

import { CreditCardIcon } from '../../payment/creditCard';

import { Action } from './reducers/errorReducer';
import { VisibilityActions } from './reducers/visibilityReducer';
import { SavedCard } from './types';

interface SavedCardFormProps {
    savedCards?: SavedCard[];
    currentCard: SavedCard | null;
    setCurrentCard(card: SavedCard): void;
    dispatchVisibility(action: Action): void;
}

const SavedCardForm: FC<SavedCardFormProps> = ({
        savedCards = [],
        currentCard,
        setCurrentCard,
        dispatchVisibility,
    }) => {

    const [dropdownOpen, toggleDropdownOpen] = useReducer(state => !state, false);
    const [newCardSelected, toggleNewCardSelected] = useReducer(state => !state, false);

    const renderDropdown = () => {
        const dropdownStyles = {
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '100%',
            zIndex: 1,
            transform: 'translate3d(0px, 57px, 0px)',
            willChange: 'transform',
        };

        const AddNewCard = () => {
            const onClick = () => {
                toggleDropdownOpen();
                setCurrentCard(null);
                dispatchVisibility({ type: VisibilityActions.showNewCard });
            };

            return <PaymentSelect isNewCard={ true } onClick={ onClick } />;
        };

        const Options = () =>
            <>
                {
                    savedCards.map(card => {
                        const onClick = () => {
                            setCurrentCard(card);
                            dispatchVisibility({ type: VisibilityActions.hideNewCard });
                            toggleDropdownOpen();
                        };

                        const isSelected = card?.token === currentCard?.token;

                        return (
                            <li
                                className={ classNames('instrumentSelect-option dropdown-menu-item', {['instrumentSelect-option--selected']: isSelected}) }
                                key={ Math.random() }
                            >
                                <PaymentSelect { ...card } onClick={ onClick } />
                            </li>
                        );
                    })
                }
                {
                    Boolean(currentCard) &&
                    <li className="instrumentSelect-option instrumentSelect-option--addNew dropdown-menu-item">
                        <AddNewCard />
                    </li>
                }

            </>;

        return (
            <div className="dropdownMenu" style={ dropdownStyles }>
                <ul className="instrumentSelect-dropdownMenu instrumentSelect-dropdownMenuNext dropdown-menu">
                    <Options />
                </ul>
            </div>
        );

    };

    // @ts-ignore
    const PaymentSelect = ({
         cardType,
         expirationDate,
         last4,
         onClick,
         isDropdownButton = false,
         isNewCard = false,
        }) =>
        (
            <button className={ classNames({['instrumentSelect-button optimizedCheckout-form-select dropdown-button form-input']: isDropdownButton }) } data-test="instrument-select" onClick={ onClick } type="button">
                <div className={ 'instrumentSelect-details' }>
                    <div className="icon cardIcon-icon icon--medium" data-test="credit-card-icon-visa">
                            <CreditCardIcon cardType={ cardType } />
                            <title>{ isNewCard ? cardType : 'Use a different card' }</title>
                    </div>
                    <div className="instrumentSelect-card" data-test="instrument-select-last4">{ isNewCard ?  'Use a different card' : `${cardType} ending in ${last4}`  }</div>
                    <div className="instrumentSelect-expiry" data-test="instrument-select-expiry">{ isNewCard || `Expires ${expirationDate}` }</div>
                </div>
            </button>
        );

    return (
        <div className="instrumentSelect custom-payment-select">
            <div className="dropdownTrigger">
                { Boolean(currentCard) && <PaymentSelect { ...currentCard } isDropdownButton={ true } onClick={ toggleDropdownOpen } /> }
                { Boolean(currentCard) || <PaymentSelect isDropdownButton={ true } isNewCard={ true } onClick={ toggleDropdownOpen } /> }

            </div>
            {
                dropdownOpen && renderDropdown()
            }
        </div>
    );
};

export default SavedCardForm;
