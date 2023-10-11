import {getEventarc, Channel} from 'firebase-admin/eventarc';
import {CallableContext} from 'firebase-functions/v1/https';

let eventChannel: Channel | undefined;

/** setup events */
export const setupEventChannel = () => {
  if (!process.env.EVENTARC_CHANNEL) return;
  eventChannel = getEventarc().channel(process.env.EVENTARC_CHANNEL, {
    allowedEventTypes: process.env.EXT_SELECTED_EVENTS,
  });
};

export const recordOnStartEvent = async (
  functionName: 'post' | 'getModel' | 'getModels',
  data: unknown,
  context?: CallableContext
) => {
  if (!eventChannel) return;

  return eventChannel.publish({
    type: 'firebase.extensions.palm-secure-backend.v1.onStart',
    subject: functionName,
    data: {
      data,
      context,
    },
  });
};

export const recordOnRequestEvent = async (
  functionName: 'post' | 'getModel' | 'getModels',
  data: unknown,
  context?: CallableContext
) => {
  if (!eventChannel) return;

  return eventChannel.publish({
    type: 'firebase.extensions.palm-secure-backend.v1.onRequest',
    subject: functionName,
    data: {
      data,
      context,
    },
  });
};

export const recordOnErrorEvent = async (
  functionName: 'post' | 'getModel' | 'getModels',
  data: unknown,
  context?: CallableContext
) => {
  if (!eventChannel) return;

  return eventChannel.publish({
    type: 'firebase.extensions.palm-secure-backend.v1.onError',
    subject: functionName,
    data: {
      data,
      context,
    },
  });
};

export const recordOnResponseEvent = async (
  functionName: 'post' | 'getModel' | 'getModels',
  data: unknown,
  context?: CallableContext
) => {
  if (!eventChannel) return;

  return eventChannel.publish({
    type: 'firebase.extensions.palm-secure-backend.v1.onResponse',
    subject: functionName,
    data: {
      data,
      context,
    },
  });
};
