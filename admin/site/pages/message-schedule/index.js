import React from 'reactn';
import Request from '../../utils/request'
import Input from '../../../libs/elements/input'
import Layout from '../../../libs/elements/layout'
import Select from '../../../libs/elements/select'
import { DatePicker, TimeSelect } from '../../../libs/elements/date-picker'
import Form from '../../../libs/elements/form'
import Button from '../../../libs/elements/button'
import Notification from '../../../libs/elements/notification'
import moment from 'moment';

import { format2 } from '../../utils/strings'

export default class SendMessage extends React.PureComponent {

    constructor(props) {
        super(props)
        this.state = {
            loading: false,
            form: {
                tid: "5ae3c890-5e55-11ea-9283-4fa18a847130",
                msg: '',
                date: null,
                time: null
            },
            rules: {
                tid: [
                    { required: true, message: 'Please select a thread', trigger: 'change' }
                ],
                msg: [
                    { required: true, message: 'Please input a message', trigger: 'change' }
                ],
                date: [
                    { type: 'date', required: true, message: 'Please pick a date', trigger: 'change' }
                ],
                time: [
                    { type: 'date', required: true, message: 'Please pick a time', trigger: 'change' }
                ],
            }
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        this.refs.form.validate((valid) => {
            if (valid) {
                const date = this.state.form.date;
                const time = this.state.form.time;
                const dt = `${date.getFullYear()}-${format2(date.getMonth() + 1)}-${format2(date.getDate())} ${format2(time.getHours())}:${format2(time.getMinutes())}:00`;
                this.setState({loading:true})
                Request(`${process.env.XCS_URL}${process.env.V2_PREFIX}/publish`, {
                    method : 'post',
                    body : {
                        tid : this.state.form.tid,
                        msg : this.state.form.msg,
                        scheduled : moment(dt).utc().toISOString()
                    }
                })
                .then(response => {
                    if (!response) {
                        throw 'Could not schedule'
                    }
                    Notification({
                        title: 'Success',
                        message: 'Message scheduled',
                        type: 'success'
                    });
                    this.resetForm();
                    this.setState({loading:false})
                })
                .catch(ex => {
                    Notification.error({
                        title: 'Error',
                        message: 'Message scheduling failed',
                    });
                    console.warn(ex)
                    this.setState({loading:false})
                })

            } else {
                console.log('error submit!!');
                return false;
            }
        });
    }


    resetForm() {
        this.refs.form.resetFields();
        this.setState({
            form:
            {
                ...this.state.form,
                msg: '',
                tid: "5ae3c890-5e55-11ea-9283-4fa18a847130"
            }
        })
        this.forceUpdate();
    }

    handleReset(e) {
        e.preventDefault();
        this.resetForm();
    }

    onChange(key, value) {
        this.setState({
            form: Object.assign({}, this.state.form, { [key]: value })
        });
    }

    render() {
        const { date, time } = this.state;

        return (
            <React.Fragment>
                <h2>Schedule a message</h2>
                <Form ref="form" className="en-US" model={this.state.form} rules={this.state.rules} labelWidth="120">
                    <Form.Item label="Thread" prop="tid">
                        <Select value={this.state.form.tid} disabled={true} onChange={this.onChange.bind(this, 'thread')}>
                            {
                                [{ value: "5ae3c890-5e55-11ea-9283-4fa18a847130", label: "Daily Pulse" }].map(el => {
                                    return <Select.Option key={el.value} label={el.label} value={el.value} />
                                })
                            }
                        </Select>
                    </Form.Item>
                    <Form.Item label="Message" prop="msg">
                        <Layout.Row>
                            <Layout.Col span="8">
                                <Input
                                    value={this.state.form.msg}
                                    type="textarea"
                                    autosize={{ minRows: 4, maxRows: 12 }}
                                    onChange={this.onChange.bind(this, 'msg')}
                                    placeholder="Message text"
                                />
                            </Layout.Col>
                        </Layout.Row>
                    </Form.Item>
                    <Form.Item label="Date" prop="date">
                        <DatePicker
                            value={this.state.form.date}
                            placeholder="Scheduled for date"
                            onChange={this.onChange.bind(this, 'date')}
                            disabledDate={time => time.getTime() < Date.now() - 8.64e7}
                        />
                    </Form.Item>
                    <Form.Item label="Time" prop="time">
                        <TimeSelect
                            start="00:00"
                            step="00:15"
                            end="23:45"
                            onChange={this.onChange.bind(this, 'time')}
                            value={this.state.form.time}
                            placeholder="Select time"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" onClick={this.handleSubmit.bind(this)} loading={this.state.loading}>Send</Button>
                        <Button onClick={this.handleReset.bind(this)}>Reset</Button>
                    </Form.Item>
                </Form>
            </React.Fragment>
        );
    }
}