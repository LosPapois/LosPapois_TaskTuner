cd ../../wallet
if kubectl create -f - -n mtdrworkshop; then
    echo "wallet2kubernetes OK"
  else
    echo "Error: Failure to create db-wallet-secret.  Retrying..."
    sleep 5
  fi <<!
apiVersion: v1
data:
  README: $(base64 -i README)
  cwallet.sso: $(base64 -i cwallet.sso)
  ewallet.p12: $(base64 -i ewallet.p12)
  keystore.jks: $(base64 -i keystore.jks)
  ojdbc.properties: $(base64 -i ojdbc.properties)
  sqlnet.ora: $(base64 -i sqlnet.ora)
  tnsnames.ora: $(base64 -i tnsnames.ora)
  truststore.jks: $(base64 -i truststore.jks)
kind: Secret
metadata:
  name: db-wallet-secret
!