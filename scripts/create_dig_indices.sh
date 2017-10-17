#!/usr/bin/env bash

# Move to script folder.
cd "${0%/*}"

echo "Looking for DIG indices..."

logs=$1/dig-logs
response=$(curl $logs --write-out %{http_code} --silent --output /dev/null)
if [ $response = "200" ]
then
  echo "$logs does exist"
fi
if [ $response = "404" ]
then
  echo "$logs does not exist"
  source create_logs_index.sh $1
fi

profiles=$1/dig-profiles
response=$(curl $profiles --write-out %{http_code} --silent --output /dev/null)
if [ $response = "200" ]
then
  echo "$profiles does exist"
fi
if [ $response = "404" ]
then
  echo "$profiles does not exist"
  source create_profiles_index.sh $1
fi

states=$1/dig-states
response=$(curl $states --write-out %{http_code} --silent --output /dev/null)
if [ $response = "200" ]
then
  echo "$states does exist"
fi
if [ $response = "404" ]
then
  echo "$states does not exist"
  source create_states_index.sh $1
fi
