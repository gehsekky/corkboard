CREATE DATABASE db_corkboard ENCODING = "UTF8";
ALTER DATABASE db_corkboard OWNER TO postgres;

\connect db_corkboard

CREATE EXTENSION "uuid-ossp";

CREATE TABLE public.user (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  email varchar(256) NOT NULL UNIQUE,
  name varchar(128) NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE public.user_identity (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user(id),
  provider varchar(32) NOT NULL,
  provider_user_id varchar(255) NOT NULL,
  email varchar(256) NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX user_identity_user_id_idx ON public.user_identity(user_id);

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

CREATE INDEX board_user_board_id_idx ON public.board_user(board_id);

CREATE TABLE public.board_invite (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES public.board(id),
  token varchar(64) NOT NULL UNIQUE,
  email varchar(256),
  invited_by UUID NOT NULL REFERENCES public.user(id),
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX board_invite_board_id_idx ON public.board_invite(board_id);

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

CREATE INDEX board_item_board_id_idx ON public.board_item(board_id);

CREATE TABLE public.board_audit (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  board_id UUID REFERENCES public.board(id),
  actor_user_id UUID REFERENCES public.user(id),
  action varchar(64) NOT NULL,
  details JSONB,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX board_audit_board_id_idx ON public.board_audit(board_id);
CREATE INDEX board_audit_created_at_idx ON public.board_audit(created_at DESC);
