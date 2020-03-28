import React from 'react';
import { Component, PropTypes } from '../..';

export default class Icon extends Component {
  render() {
    return <i style={this.style()} className={this.className(`el-icon-${this.props.name}`)}></i>;
  }
}

Icon.propTypes = {
  name: PropTypes.string
}
