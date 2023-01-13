package messaging

import (
	"fmt"
	"log"
	"os"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

var client mqtt.Client

var gasPriceMsgHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("Message %s received on topic %s\n", msg.Payload(), msg.Topic())
}

var messagePubHandler mqtt.MessageHandler = func(client mqtt.Client, msg mqtt.Message) {
	fmt.Printf("Message %s received on topic %s\n", msg.Payload(), msg.Topic())
}

var connectHandler mqtt.OnConnectHandler = func(client mqtt.Client) {
	fmt.Println("Connected")
}

var connectionLostHandler mqtt.ConnectionLostHandler = func(client mqtt.Client, err error) {
	fmt.Printf("Connection Lost: %s\n", err.Error())
}

func Start() {
	msgServerUrl := os.Getenv("MSG_PARAMS")
	msgClientId := os.Getenv("MSG_CLIENT_ID")
	msgServerUser := os.Getenv("MSG_SERVER_USER")
	msgServerPwd := os.Getenv("MSG_SERVER_PWD")
	options := mqtt.NewClientOptions()
	options.AddBroker(msgServerUrl)
	options.SetClientID(msgClientId)
	options.SetUsername(msgServerUser)
	options.SetPassword(msgServerPwd)
	options.SetDefaultPublishHandler(messagePubHandler)
	options.OnConnect = connectHandler
	options.OnConnectionLost = connectionLostHandler

	client = mqtt.NewClient(options)
	token := client.Connect()
	if token.Wait() && token.Error() != nil {
		log.Printf("Connection failed: %v\n", token.Error())
	} else {
		log.Printf("Connected to: %v id: %v\n", msgServerUrl, msgClientId)
	}

	msgGasPriceTopic := os.Getenv("MSG_GAS_PRICE_TOPIC")
	token = client.Subscribe(msgGasPriceTopic, 1, gasPriceMsgHandler)
	if token.Wait() && token.Error() != nil {
		log.Printf("Topic subription to topic: %v failed: %v", msgGasPriceTopic, token.Error().Error())
	} else {
		log.Printf("Subscribed to topic %s\n", msgGasPriceTopic)
	}
}

func Stop() {
	client.Disconnect(1000)
}

func SendMsg(msg string) {
	msgGasPriceTopic := os.Getenv("MSG_GAS_PRICE_TOPIC")
	client.Publish(msgGasPriceTopic, 1, false, msg)
}