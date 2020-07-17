import React from 'react';

export default class Components extends React.Component {
  render() {
    return (
      <div>
        <div>component</div>
        {
          this.props.children
        }
      </div>
    )
  }
}