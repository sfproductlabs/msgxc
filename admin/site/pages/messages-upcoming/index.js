import React from 'reactn';
import Messages from '../../components/messages/messages';
import Request from '../../utils/request'
import Input from '../../../libs/elements/input'
import Layout from '../../../libs/elements/layout'
import Select from '../../../libs/elements/select'
import { DatePicker, TimeSelect } from '../../../libs/elements/date-picker'
import Form from '../../../libs/elements/form'
import Button from '../../../libs/elements/button'
import Notification from '../../../libs/elements/notification'


export default class MessagesRecent extends React.PureComponent {

    constructor(props) {
        super(props);
        this.state = {};       
    }

    componentDidMount() {
        Request(`http://localhost:5000/ping`)
            .then(response => {
                const {
                    data,
                } = response
                //this.setGlobal({ messages: data });
                this.setState({messages: data});
            })
            .catch(console.warn)
    }

    render() {
      

        return (
            <React.Fragment>
                <h2>Upcoming messages</h2>
                <div>
                    <Messages data={this.state.messages} />
                </div>
            </React.Fragment>
        );
    }
}