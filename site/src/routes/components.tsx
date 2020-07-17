import React from 'react';
import Components from '../views/components';
import Button from 'docs/button.mdx';

const components = [
  {
    component: Components,
    path: '/components',
    children: [
      {
        component: Button,
        path: '/components/button',
        exact: true,
      }
    ]
  }
];

export default components;