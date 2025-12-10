import React, { Component } from "react";

import classes from "./Select.css";

class Select extends Component {
  constructor(props) {
    super(props);
  }

  //On the change event for the select box pass the selected value back to the parent
  handleChange = event => {
    let selectedValue = event.target.value;
    console.log("id: ",event.target)
    if (selectedValue !== "select") {
      this.props.onSelectChange(selectedValue);
    }
  };

  render() {
    let arrayOfData = this.props.arrayOfData;
    let options = arrayOfData.map(data => (
      <option key={data.id} value={data.id}>
        {data.name}
      </option>
    ));

    return (
      <select
        className={[classes.Select, classes[this.props.Select]].join(" ")}
        onChange={this.handleChange}
      >
        {options}
      </select>
    );
  }
}

export default Select;
