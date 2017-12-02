import boto3
import base64
import secrets

BUCKET = "biometric-image-storage"

def compare_faces(bucket, key, bucket_target, key_target, threshold=80, region="us-east-1"):
	rekognition = boto3.client("rekognition", region)
	response = rekognition.compare_faces(
	    SourceImage={
			"S3Object": {
				"Bucket": bucket,
				"Name": key,
			}
		},
		TargetImage={
			"S3Object": {
				"Bucket": bucket_target,
				"Name": key_target,
			}
		},
	    SimilarityThreshold=threshold,
	)
	return response['SourceImageFace'], response['FaceMatches']



def post_handler(event, context):
    try:
        KEY_USER = event['userId']
        target = base64.b64decode(event['base64Image'])
        s3_object = boto3.resource('s3').Object(BUCKET,'_target_.jpg')
        s3_object.put(Body=target)
    
        referenceTable = boto3.resource('dynamodb', 'us-east-1').Table('bioImageReference')
        # return referenceTable.get_item(Key={'userId' : KEY_USER})
        tokenTable = boto3.resource('dynamodb', 'us-east-1').Table('verificationRef')
    
        KEY_SOURCE = referenceTable.get_item(Key={'userId' : KEY_USER})['Item']['path']
    
        source_face, matches = compare_faces(BUCKET, KEY_SOURCE, BUCKET, '_target_.jpg')
        
        if matches:
            item =  {
                "userId" : KEY_USER
                "tokenId": secrets.token_hex(16),
                "expiration": 5
            }
            tokenTable.put_item(Item=item)
            del item['userId']
            return item
        else:
            return {
                "code": 403,
                "message": "Unauthorized User",
                "fields": "Error"
            }
    except:
        return {
            "code": 500,
            "message": "Unexpected error occurs!",
            "fields": "Please try again"
        }