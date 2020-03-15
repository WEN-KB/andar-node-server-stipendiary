ifeq ($(env),)
env := mc-prod
endif
all:
	$(info use example: env=mc-bq make)
	echo environment is $(env)
	cp  creds/$(env)/* ./creds/
	cp  -R creds/mosquitto-config/$(env)/* ./creds/mosquitto/
	cp  environment/$(env)/* ./
<<<<<<< 32bc8f6297e78ac7b8bb68fd287a7cef297ace24
	cp  environment/$(env)/.env ./	
=======
	
>>>>>>> Modules build config with diffenet env, creds, see Makefile
