const kafka = require('kafka-node');
const client = new kafka.KafkaClient({
    kafkaHost: process.env.KAFKA_HOST
});

//Topics & Admin
const topicsToCreate = [{
    topic: process.env.ROOT_REALTIME_TOPIC,
    partitions: 1,
    replicationFactor: parseInt(process.env.KAFKA_REPLICATION || 1)
}];

client.createTopics(topicsToCreate, (error, result) => {
    // result is an array of any errors if a given topic could not be created
    console.error(result);
});

//Producer
const Producer = kafka.Producer;
const pclient = new kafka.KafkaClient({
    kafkaHost: process.env.KAFKA_HOST
})
const producer = new Producer(pclient);

//Consumer
const Consumer = kafka.Consumer;
const cclient = new kafka.KafkaClient({
    kafkaHost: process.env.KAFKA_HOST
});
const consumer = new Consumer(
    cclient,
    [{
        topic: process.env.ROOT_REALTIME_TOPIC,
        partition: 0
    }], {
        autoCommit: true
    }
);

module.exports = {
    consumer,
    producer
}
