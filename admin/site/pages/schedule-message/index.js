import React from 'reactn'; 
import Messages from '../../components/messages/messages';
import Request from '../../utils/request'

export default class Cards extends React.PureComponent {
  componentDidMount() {
    Request(`http://localhost:5000/ping`)
        .then(response => {
            const {
                data,
            } = response    
            this.setGlobal({messages: data});
        })
        .catch(console.warn)
  }

  render() {
    return (
        <React.Fragment>
            <h2>Schedule a message</h2>
            <div>
                <Messages/>
            </div>
        </React.Fragment>
    );
  }
}