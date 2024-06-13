CREATE DATABASE db_corkboard ENCODING = "UTF8";
ALTER DATABASE db_corkboard OWNER TO postgres;

\connect db_corkboard

CREATE EXTENSION "uuid-ossp";

CREATE TABLE public.user (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  email varchar(256) NOT NULL UNIQUE,
  name varchar(128) NOT NULL,
  salt varchar(16) NOT NULL,
  password_hash varchar(256) NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.board (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  name varchar(1024) NOT NULL,
  background_color varchar(7) NOT NULL,
  created_by UUID NOT NULL REFERENCES public.user(id),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.board_user (
  user_id UUID NOT NULL REFERENCES public.user(id),
  board_id UUID NOT NULL REFERENCES public.board(id),
  is_deleted boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, board_id)
);

CREATE TABLE public.board_item (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES public.board(id),
  created_by UUID NOT NULL REFERENCES public.user(id),
  content text NOT NULL,
  background_color varchar(7) NOT NULL,
  x float NOT NULL,
  y float NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);
