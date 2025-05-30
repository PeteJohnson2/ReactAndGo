/*
  - Copyright 2022 Sven Loesekann
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { Box, Tab, Tabs } from '@mui/material';
import { useEffect, useState, SyntheticEvent } from 'react';
import DataTable, { TableDataRow } from './DataTable';
import GsMap, { GsValue } from './GsMap';
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from 'recoil';
import GlobalState from '../GlobalState';
//import styles from './main.module.scss';
import Chart, {TimeSlot} from './Chart';



interface GasPriceAvgs {
	Postcode:        string
	County:          string
	State:           string
	CountyAvgDiesel: number
	CountyAvgE10:    number
	CountyAvgE5:     number
	StateAvgDiesel:  number
	StateAvgE10:     number
	StateAvgE5:      number
}

interface GasStation {  
  StationName: string;
  Brand: string;
  Street: string;
  Place: string;
  HouseNumber: string;
  PostCode: string;
  Latitude: number;
  Longitude: number;
  PublicHolidayIdentifier: string;
  OtJson: string;
  FirstActive: Date;
  GasPrices: GasPrice[];
}

interface GasPrice {
  E5: number;
  E10: number;
  Diesel: number;
  Date: string;
  Changed: number;
}

interface Notification {
  Timestamp: Date;
  UserUuid: string;
  Title: string;
  Message: string;
  DataJson: string;
}

interface MyDataJson {
  StationName: string;
  Brand: string;
  Street: string;
  Place: string;
  HouseNumber: string;
  PostCode: string;
  Latitude: number;
  Longitude: number;
  E5: number;
  E10: number;
  Diesel: number;
  Timestamp: string;
}

interface TimeSlotResponse {
  ID:            number;
  CreatedAt:     Date;
  UpdatedAt:     Date;
  DeletedAt:     Date;
  GasStationNum: number;
  AvgE5:         number;
  AvgE10:        number;
  AvgDiesel:     number;
  GsNumE5:       number;
  GsNumE10:      number;
  GsNumDiesel:   number;
  StartDate:     Date;    
  CountyDataID:  number;
}

export default function Main() {  
  const [controller, setController] = useState(null as AbortController | null);
  const [timer, setTimer] = useState(undefined as undefined | NodeJS.Timer);
  const [value, setValue] = useState(0);
  const [first, setFirst] = useState(true);
  const [rows, setRows] = useState([] as TableDataRow[]);
  const [avgTimeSlots, setAvgTimeSlots] = useState([] as TimeSlot[])
  const [gsValues, setGsValues] = useState([] as GsValue[]);
  const globalJwtTokenState = useRecoilValue(GlobalState.jwtTokenState);
  const globalUserUuidState = useRecoilValue(GlobalState.userUuidState);
  const globalUserDataState = useRecoilValue(GlobalState.userDataState);    
  const refreshJwtTokenState = useRecoilRefresher_UNSTABLE(GlobalState.jwtTokenState);    

  const handleTabChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
    clearInterval(timer);
    getData(newValue);
    setTimer(setInterval(() => getData(newValue), 10000));
  }

  const formatPostCode = (myPlz: number) => {                
    return '00000'.substring(0, 5 - myPlz?.toString()?.length > 0 ? myPlz?.toString()?.length : 0) + myPlz.toString();
  }

  const getData = (newValue: number) => {
    if (globalJwtTokenState?.length < 10 || globalUserUuidState?.length < 10) {
      return;
    }    
    //console.log(newValue); 
    if(!!controller) {
      controller.abort();
    }
    setController(new AbortController()); 
    refreshJwtTokenState();  
    // jwtToken = globalJwtTokenState; //When recoil makes refresh work.
    const jwtToken = !!GlobalState.jwtToken ? GlobalState.jwtToken : globalJwtTokenState;  
    if (newValue === 0 || newValue === 2) {           
      fetchSearchLocation(jwtToken);
    } else {     
      fetchLastMatches(jwtToken);
    };
  }

  const fetchSearchLocation = (jwtToken: string) => {    
    const requestOptions2 = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
      body: JSON.stringify({ Longitude: globalUserDataState.Longitude, Latitude: globalUserDataState.Latitude, Radius: globalUserDataState.SearchRadius }),
      signal: controller?.signal
    }      
    fetch('/gasstation/search/location', requestOptions2).then(myResult => myResult.json() as Promise<GasStation[]>).then(myJson => {
      const myResult = myJson.filter(value => value?.GasPrices?.length > 0).map(value => {
        return value;
      }).map(value => ({        
        location: value.Place + ' ' + value.Brand + ' ' + value.Street + ' ' + value.HouseNumber, e5: value.GasPrices[0].E5,
        e10: value.GasPrices[0].E10, diesel: value.GasPrices[0].Diesel, date: new Date(Date.parse(value.GasPrices[0].Date)), longitude: value.Longitude, latitude: value.Latitude
      } as TableDataRow));      
      const requestOptions3 = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },        
        signal: controller?.signal
      }  
      const myPostcode = formatPostCode(globalUserDataState.PostCode); 
      fetch(`/gasprice/avgs/${myPostcode}`, requestOptions3).then(myResult => myResult.json() as Promise<GasPriceAvgs>).then(myJson => {
        const rowCounty = ({        
          location: myJson.County, e5: Math.round(myJson.CountyAvgE5), e10: Math.round(myJson.CountyAvgE10), diesel: Math.round(myJson.CountyAvgDiesel), date: new Date(), longitude: 0, latitude: 0
        } as TableDataRow);
        const rowState = ({        
          location: myJson.State, e5: Math.round(myJson.StateAvgE5), e10: Math.round(myJson.StateAvgE10), diesel: Math.round(myJson.StateAvgDiesel), date: new Date(), longitude: 0, latitude: 0
        } as TableDataRow);
        const resultRows = [rowCounty, rowState, ...myResult]
        setRows(resultRows);
      });         
      setGsValues(myResult);
    }).then(() => setController(null));
  }

  const fetchLastMatches = (jwtToken: string) => {    
    const requestOptions1 = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
      signal: controller?.signal
    }
    fetch(`/usernotification/current/${globalUserUuidState}`, requestOptions1).then(myResult => myResult?.json() as Promise<Notification[]>).then(myJson => {
      //console.log(myJson);
      const result = myJson?.map(value => {
        //console.log(JSON.parse(value?.DataJson));
        return (JSON.parse(value?.DataJson) as MyDataJson[])?.map(value2 => {
          //console.log(value2);
          return {
            location: value2.Place + ' ' + value2.Brand + ' ' + value2.Street + ' ' + value2.HouseNumber,
            e5: value2.E5, e10: value2.E10, diesel: value2.Diesel, date: new Date(Date.parse(value2.Timestamp)), longitude: 0, latitude: 0
          } as TableDataRow;
        });
      })?.flat() || [];
      setRows(result);
      //const result 
      const requestOptions2 = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` },
        signal: controller?.signal
      }
      const myPostcode = formatPostCode(globalUserDataState.PostCode);      
      fetch(`/postcode/countytimeslots/${myPostcode}`, requestOptions2).then(myResult1 => myResult1.json() as Promise<TimeSlotResponse[]>).then(myJson1 => {
        const timeSlots = [] as TimeSlot[];
        timeSlots.push(...myJson1.filter(myValue => myValue.AvgDiesel > 10).map(myValue => {          
          const dieselTimeSlot = {x: '00.00', diesel: 0, e10: 0, e5: 0} as TimeSlot;        
            const myDate = new Date(myValue.StartDate);  
            dieselTimeSlot.x = ''+myDate.getHours()+':'+(myDate.getMinutes().toString().length < 2 ? myDate.getMinutes().toString().length +'0': myDate.getMinutes());
            dieselTimeSlot.diesel = myValue.AvgDiesel/1000;            
            dieselTimeSlot.e10 = myValue.AvgE10/1000;
            dieselTimeSlot.e5 = myValue.AvgE5/1000;
          return dieselTimeSlot;
        }));        
        setAvgTimeSlots(timeSlots);
        //console.log(myJson1);
      });
    })
    .then(() => setController(null));
  }

  // eslint-disable-next-line
  useEffect(() => {
    if (globalJwtTokenState?.length > 10 && globalUserUuidState?.length > 10 && first) {
      setTimeout(() => handleTabChange({} as unknown as SyntheticEvent,  value), 3000);
      setFirst(false);
    }    
  });

  return (<Box sx={{ width: '100%' }}>
    <Tabs value={value} onChange={handleTabChange} centered={true}>
      <Tab label="Current Prices"/>
      <Tab label="Last Price matches"/>
      <Tab label="Current Prices Map"/>
    </Tabs>
    { value === 0 && 
      <DataTable diesel='Diesel' e10='E10' e5='E5' location='Location' showAverages={true} time='Time' rows={rows}></DataTable>}    
    { value === 1 && 
      <Chart timeSlots={avgTimeSlots}></Chart>}
    { value === 1 && 
      <DataTable diesel='Diesel' e10='E10' e5='E5' location='Location' showAverages={true} time='Time' rows={rows}></DataTable>}    
    { value === 2 &&
      <GsMap gsValues={gsValues} center={globalUserDataState}></GsMap>}    
  </Box>);
}