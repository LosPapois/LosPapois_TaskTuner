COPY WALLET HERE
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
minikube image load agileimage:0.1
kubectl get secret dbuser -n mtdrworkshop --template={{.data.dbpassword}} #lin
kubectl get secret dbuser -n mtdrworkshop -o jsonpath="{.data.dbpassword}" #win