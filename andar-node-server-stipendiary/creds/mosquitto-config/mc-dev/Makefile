
client:
	openssl genrsa -out client.key 2048
	openssl req -out client.csr -key client.key -new
	openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -out client.crt -days 18250 -addtrust clientAuth
#Taiwan R.O.C
ca: 
	openssl req -new -x509 -days 18250  -extensions v3_ca -keyout ca.key  -out ca.crt

server:
	openssl genrsa -out server.key 2048
	openssl req -out server.csr -key server.key -new
	openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 18250
