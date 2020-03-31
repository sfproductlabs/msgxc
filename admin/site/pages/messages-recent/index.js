import React from 'reactn';
import * as R from 'ramda'; 
import Messages from '../../components/messages/messages';
import Request from '../../utils/request'
import Input from '../../../libs/elements/input'
import Layout from '../../../libs/elements/layout'
import Select from '../../../libs/elements/select'
import { DatePicker, TimeSelect } from '../../../libs/elements/date-picker'
import Form from '../../../libs/elements/form'
import Button from '../../../libs/elements/button'
import Notification from '../../../libs/elements/notification'
import Table from '../../../libs/elements/table'
import Loading from '../../../libs/elements/loading'
import moment from 'moment';

export default class MessagesRecent extends React.PureComponent {

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            columns: [
              {
                label: "Date",
                prop: "updated",
                width: 300,
                fixed: 'left',
                render: (el)=>{
                    return <span>{moment(el.updated).format('LLLL')}</span>
                  }
              },
              {
                label: "Message",
                prop: "msg",
                width: 220
              },
              {
                label: "Subject",
                prop: "subject",
                width: 120
              },
              {
                label: "Meta",
                prop: "meta",
                width: 360,
                render: (el)=>{
                    return <span>{JSON.stringify(el.meta)}</span>
                }
              },
              {
                label: "Sender",
                prop: "owner",
                width: 310
              }
            ],
            data: []
        }  
    }

    componentDidMount() {
        Request(`${process.env.XCS_URL}${process.env.V2_PREFIX}/reports/messages_recent`)
            .then(response => {
                const {
                    data,
                    body
                } = response;
                //this.setGlobal({ messages: data });
                const table = (R.path(['hits','hits'], data || body) || []).map(f=> {
                    return f.Source;
                });
                this.setState({data: table, loading: false});
            })
            .catch(console.warn)
    }

    render() {
        return (
            <React.Fragment>
                <h2>Recent messages</h2>
                <div>
                <Loading loading={this.state.loading}>
                    <Table
                        style={{width: '100%'}}
                        columns={this.state.columns}
                        data={this.state.data}
                        border={true}
                        height={400}
                        stripe={true}
                    />
                </Loading>
                </div>
            </React.Fragment>
        );
    }
}