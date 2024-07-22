import moment from 'moment';

export const formattedArray = (data:string[])=>{
    return data?.map(name => ({
        label: name,
        value: name
      }));
  };

  export const convertTimestampToDateTime=(timestamp:number)=> {
    return moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss');
  }

  export const parseVersionString=(version: string)=> {
    const parts = version.split('.');
  
    return {
      major: parts[0] !== 'x' ? parseInt(parts[0], 10) : -1,
      minor: parts[1] !== 'x' ? parseInt(parts[1], 10) : -1,
      patch: parts[2] !== 'x' ? parseInt(parts[2], 10) : -1,
    };
  }