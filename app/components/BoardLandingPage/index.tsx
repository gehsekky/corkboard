import BoardLanding from 'components/BoardLanding';

type BoardLandingPageProps = {

};

const BoardLandingPage = ({} : BoardLandingPageProps) => {
  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <div className="h-full w-full">
        <BoardLanding />
      </div>
    </div>
  );
};

export default BoardLandingPage;
