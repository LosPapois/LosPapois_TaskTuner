
# Collect DB password and create secret

if kubectl apply -f -; then
    echo "Namespace created"
    break
else
    echo 'Error: Creating DB Password Secret Failed.  Retrying...'
    sleep 10
fi <<!
apiVersion: v1
kind: Namespace
metadata:
  name: mtdrworkshop
!

