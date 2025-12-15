BASE64_DB_PASSWORD=`echo "None00010001" | base64`
if kubectl create -n mtdrworkshop -f -; then
      echo "PASS OK"
      break
    else
      echo 'Error: Creating DB Password Secret Failed.  Retrying...'
      sleep 10
    fi <<!
{
   "apiVersion": "v1",
   "kind": "Secret",
   "metadata": {
      "name": "dbuser"
   },
   "data": {
      "dbpassword": "${BASE64_DB_PASSWORD}"
   }
}
!