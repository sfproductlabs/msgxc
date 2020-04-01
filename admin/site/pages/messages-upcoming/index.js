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

export default class MessagesUpcoming extends React.PureComponent {

    constructor(props) {
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = {
            loading: true,
            columns: [
                {
                    label: "Date",
                    prop: "scheduled",
                    width: 300,
                    fixed: 'left',
                    render: (el) => {
                        return <span>{moment(el.scheduled).format('LLLL')}</span>
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
                    label: "Operations",
                    fixed: 'right',
                    width: 120,
                    render: (el) => {
                        return <span><Button type="text" size="small" onClick={() => { this.run(el) }}>Run</Button><Button type="text" size="small" onClick={() => { this.cancel(el) }}>Cancel</Button></span>
                    }
                }
            ],
            data: []
        }
    }

    run(m) {
        Request(`${process.env.XCS_URL}${process.env.V2_PREFIX}/execute/message`, {
            method: 'post',
            body: {
                tid: m.tid,
                mid: m.mid
            }
        })
        .then(response => {
            if (!response) {
                throw 'Could not send'
            }
            Notification({
                title: 'Success',
                message: 'Message sent',
                type: 'success'
            });
            this.setState({ loading: true });
            setTimeout(this.componentDidMount, 3000);
        })
        .catch(ex => {
            Notification.error({
                title: 'Error',
                message: 'Message sending failed',
            });
            console.warn(ex)
        })
    }

    cancel(m) {
        Request(`${process.env.XCS_URL}${process.env.V2_PREFIX}/cancel`, {
            method: 'post',
            body: {
                tid: m.tid,
                mid: m.mid
            }
        })
        .then(response => {
            if (!response) {
                throw 'Could not cancel'
            }
            Notification({
                title: 'Success',
                message: 'Message canceled',
                type: 'success'
            });
            this.setState({ loading: true });
            setTimeout(this.componentDidMount, 3000);
        })
        .catch(ex => {
            Notification.error({
                title: 'Error',
                message: 'Message canceling failed',
            });
            console.warn(ex)
        })
    }

    componentDidMount() {
        Request(`${process.env.XCS_URL}${process.env.V2_PREFIX}/reports/messages_upcoming`)
        .then(response => {
            const {
                data,
                body
            } = response;
            //this.setGlobal({ messages: data });
            const table = (R.path(['hits', 'hits'], data || body) || []).map(f => {
                return f.Source;
            });
            this.setState({ data: table, loading: false });
        })
        .catch(console.warn)
    }

    render() {
        return (
            <React.Fragment>
                <h2>Upcoming messages</h2>
                <div>
                    <Loading loading={this.state.loading}>
                        <Table
                            style={{ width: '100%' }}
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