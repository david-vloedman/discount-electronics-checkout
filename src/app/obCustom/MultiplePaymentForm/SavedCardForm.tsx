/* eslint-disable react/jsx-no-bind */
// @ts-nocheck
import classNames from 'classnames';
import React, { useReducer, FC } from 'react';

export interface SavedCard {
    cardType: string;
    expirationDate: string;
    isDefault: boolean;
    last4: string;
    id: string;
}
interface SavedCardFormProps {
    savedCards?: SavedCard[];
    currentCard: SavedCard | null;
    setCurrentCard(card: SavedCard): void;
}

const SavedCardForm: FC<SavedCardFormProps> = ({
        savedCards = [],
        currentCard,
        setCurrentCard,
    }) => {

    const [dropdownOpen, toggleDropdownOpen] = useReducer(state => !state, false);

    if ( ! currentCard ) { return null; }

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

        const Options = () =>
            <>
                {
                    savedCards.map(card => {
                        const onClick = () => setCurrentCard(card);
                        const isSelected = card.id === currentCard.id;

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
                            {
                                // icon
                            }
                            <title id="iconCardVisaTitle">{ cardType }</title>
                    </div>
                    <div className="instrumentSelect-card" data-test="instrument-select-last4">{ `${cardType} ending in ${last4}` }</div>
                    <div className="instrumentSelect-expiry" data-test="instrument-select-expiry">{ `Expires ${expirationDate}` }</div>
                </div>
            </button>
        );

    return (
        <div className="instrumentSelect">
            <div className="dropdownTrigger">
                <PaymentSelect { ...currentCard } isDropdownButton={ true } onClick={ toggleDropdownOpen } />
            </div>
            {
                dropdownOpen && renderDropdown()
            }
        </div>
    );
};

export default SavedCardForm;
