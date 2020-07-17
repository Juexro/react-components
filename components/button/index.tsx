import React from 'react';
import './style.less';

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  type?: string;
}

export default function Button(props: ButtonProps) {
  const { type = 'default', className, ...rest } = props;

  const computedClasses = () => {
    const classes = ['jrc-button'];
    if (className) {
      classes.push(className);
    }
    classes.push(`jrc-button--${type}`);
    return classes.join(' ');
  }

  return (
    <button {...rest} className={computedClasses()}>button</button>
  )
}