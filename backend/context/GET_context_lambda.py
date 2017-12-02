import json
import boto3

contextTable = boto3.resource('dynamodb', 'us-east-1').Table('userContext')
def get_handler(event, context):
    # return context_table.get_item(Key={'userId': event['userId']})
    response = contextTable.get_item(Key={'userId': event['userId']})
    if 'Item' in response:
        # print({"events" : [response['Item']]})
        return {"events" : [response['Item']]}
    else:
        return {
            "code": 500,
            "message": "Unexpected error occurs!",
            "fields": "Please try again"
        }
