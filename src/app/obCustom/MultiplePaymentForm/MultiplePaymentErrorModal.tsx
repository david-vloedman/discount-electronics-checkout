import React, { FC } from 'react';

import { ErrorModal } from '../../common/error';

// export interface ErrorModalProps {
//     error?: Error | RequestError;
//     message?: ReactNode;
//     title?: ReactNode;
//     shouldShowErrorCode?: boolean;
//     onClose?(event: Event, props: ErrorModalOnCloseProps): void;
// }

export interface MultiplePaymentErrorModalProps {
    isOpen?: boolean;
    message?: string;
    title?: string;
    onClose?(): void;
}

const MultiplePaymentErrorModal: FC<MultiplePaymentErrorModalProps> = ({ message, title, onClose, isOpen }) => {
    const Message = () => <>{ message }</>;
    const Title = () => <>{ title }</>;

    if ( ! isOpen ) {
        return null;
    }

    return <ErrorModal error={ new Error('test') } message={ <Message /> } onClose={ onClose } title={ <Title /> } />;
};

export default MultiplePaymentErrorModal;
