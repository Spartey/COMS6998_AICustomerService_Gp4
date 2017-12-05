from __future__ import print_function
import json
import base64
import boto3
import secrets
import time
import datetime

# Call to Dynamodb
contextTable = boto3.resource('dynamodb', 'us-east-1').Table('userContext')

def stream_handler(event, context):
    for record in event['Records']:
       #Kinesis data is base64 encoded so decode here
       payload = base64.b64decode(record["kinesis"]["data"])
       data_json = payload.decode('utf8')
       data_json = json.loads(data_json)
       
       # construct context event for storing
       contextEvent = {
           "uuid" : secrets.token_hex(16),
           "userId" : data_json['userId'],
           "eventType": "GENERAL",
            "metadata": {
                "title": "I see you’re at" + "(" + str(data_json['location']['lat']) + "," + str(data_json['location']['long']) + ")",
                "promptText": "Would you like to book any of these restaurants?", 
                "actions": [
                    {
                        "title": "Sangria 46",
                        "message": "I would like to make a dining reservation at Sangria 46." 
                    }
                ]
            },
            "timestamp" : str(datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d %H:%M:%S'))
       }
       
       contextTable.put_item(Item=contextEvent)
       print("successfully save the context!")