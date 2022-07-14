import React, { FC } from 'react';

interface FormFieldErrorProps {
    message: string;
    name: string;
    hasError: boolean;
}
const FormFieldError: FC<FormFieldErrorProps> = ({ message, name, hasError = false }) => {

    if ( ! hasError ) { return null; }

    return (
        <ul className="form-field-errors">
            <li className="form-field-error">
                <label
                    aria-live="polite"
                    className="form-inlineMessage"
                    htmlFor={ name }
                    role="alert"
                >
                    { message }
                </label>
            </li>
        </ul>
    );

};

export default FormFieldError;
