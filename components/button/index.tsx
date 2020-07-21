import React from 'react';
import './style.less';
import { classNames } from 'components/utils';

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  type?: string;
}

export default function Button(props: ButtonProps) {
  const { type = 'default', className, ...rest } = props;

  return (
    <button {...rest}
      className={classNames(className, {
        'jrc-button': true,
        [`jrc-button--${type}`]: true
      })}></button>
  )
}