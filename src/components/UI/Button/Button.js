import React from 'react';

import classes from './Button.css';

const button = (props) => (
    <button
        disabled={props.disabled}
        className={[props.className,classes.Button, classes[props.btnType]].join(' ')}
        active={props.active}
        onClick={props.clicked}
    >
        {props.children}
    </button>
);

export default button;