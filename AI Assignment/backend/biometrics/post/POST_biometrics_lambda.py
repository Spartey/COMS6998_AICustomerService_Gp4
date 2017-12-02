import json
import boto3
import base64

referenceTable = boto3.resource('dynamodb', 'us-east-1').Table('bioImageReference')

def put_handler(event, context):
    # TODO implement
    try:
        key = event['userId']
        image = base64.b64decode(event['base64Image'])
        path = key + '.jpg'
        bucket = 'biometric-image-storage'
        s3_object = boto3.resource('s3').Object('biometric-image-storage',path)
        s3_object.put(Body=image)
    
        item = {'userId' : key, 'path' : path}
        referenceTable.put_item(Item=item)
    
        return {
            "status": "success",
            "message": "You have successfully upload a photo!"
        }
    except:
        return {
            "code": 500,
            "message": "Unexpected Error occurs!",
            "fields": "Please try again"
        }
