const aws = require("aws-sdk");
aws.config.update({region: 'us-east-1'});
var ses = new aws.SES();
var dynamodb = new aws.DynamoDB({ apiVersion: '2012-08-10' });
console.log(" starting  indexjs")

exports.handler = function (event, context, callback) {
console.log("starting handler");
let currentTime = new Date().getTime();
let ttl = 900 *1000;
let expirationTime = (currentTime + ttl).toString();
let msg = event.Records[0].Sns.Message;
let j_msg =JSON.parse(msg);
let email = j_msg.email;
let uuid = j_msg.uuid;
let query_Params = {
        TableName: 'csye6225',
        Key: {
            'id': { S: email }
        },
    };
let post_Params = {
        TableName: "csye6225",
        Item: {
            id: { S: email },
            ttl: { N: expirationTime },
            token: { S: uuid }
        }
    };
var params = {
    Destination: {
        ToAddresses: [
            email
        ]
    },
    Message: {
        Body: {
            Html:{
          
                 Data:  `<html><head></head><body>${"http://prod.mahesh-prasad.site/token="+uuid}</body></html>`
            
            }
        },
        Subject: {
            Charset: "UTF-8",
            Data: " Password Reset Link"
        }
    },
    Source: "passwordreset@prod.mahesh-prasad.site"
};


    dynamodb.getItem(query_Params, (err, data) => {
        console.log("callback func reached");
        if (err) {
            console.log(" failed to perform query : "+err);
        } else {
            console.log(data.Item);
            let stringy_data = JSON.stringify(data);
            let json_data = JSON.parse(stringy_data);
 
            if (data.Item == undefined) {

                dynamodb.putItem(post_Params, (err, data) => {
                    if (err) {
                        console.log( "error putting value to dynamodb" +err);
                    } else {
                        console.log('uploaded value to dynamodb successfully');
                        ses.sendEmail(params).promise().then((data) => {
                                console.log("email successfully sent");
                            })
                            .catch((err)=>{
                                console.log("error occured"+ err)
                            })
  
                    }
                });
            } else {
                let curr_time = new Date().getTime();
                let ttl_db = Number(json_data.Item.ttl.N);
                if (curr_time > ttl_db) {
                    dynamodb.putItem(post_Params, (err, data) => {
                        if (err) {
                        console.log( "error putting value to dynamodb" +err);
                        } 
                        else {
                        console.log('updating value to dynamodb successfully');
                        ses.sendEmail(params).promise().then((data) => {
                                console.log("email successfully sent");
                            })
                            .catch((err)=>{
                                console.log("error occured"+ err)
                            })
                          
                        }
                    });
                } else {
                    console.log('Email already triggered for the user  : '+email+' in the last 15 mins ');
                }
            }
        }
    });

// ses.sendEmail(params).promise().then((data) => {
//         console.log("email successfully sent");
//     })
//     .catch((err)=>{
//         console.log("error occured"+ err)
//     })
  


    // dynamodb.putItem(post_Params, (err, data) => {
    //                 if (err) {
    //                     console.log(err);
    //                 } else {
    //                     console.log(data);
    //                 }
    //  })

}
console.log(" lamba complete ")